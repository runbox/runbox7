// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2019 Runbox Solutions AS (runbox.com).
// 
// This file is part of Runbox 7.
// 
// Runbox 7 is free software: You can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the
// Free Software Foundation, either version 3 of the License, or (at your
// option) any later version.
// 
// Runbox 7 is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
// General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with Runbox 7. If not, see <https://www.gnu.org/licenses/>.
// ---------- END RUNBOX LICENSE ----------

import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { StorageService } from '../storage.service';
import { Contact } from './contact';
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { AsyncSubject, Observable, Subject, ReplaySubject } from 'rxjs';
import * as moment from 'moment';

@Injectable()
export class ContactsService implements OnDestroy {
    settingsSubject = new AsyncSubject<any>();
    contactsSubject = new ReplaySubject<Contact[]>(1);
    contactsByEmail = new ReplaySubject<any>(1);
    contactGroups   = new ReplaySubject<string[]>(1);
    informationLog  = new Subject<string>();
    errorLog        = new Subject<HttpErrorResponse>();
    migrationResult = new Subject<number>();

    migrationWatcher: any;

    syncInterval: any;
    syncIntervalSeconds = 15;
    lastUpdate: moment.Moment;

    constructor(
        private rmmapi: RunboxWebmailAPI,
        private storage: StorageService,
    ) {
        storage.get('contactsCache').then(cache => {
            if (!cache) {
                return;
            }
            console.log('Loading contacts from local cache');
            const contacts = JSON.parse(cache).map((c: any) => new Contact(c));
            this.processContacts(contacts);
        });

        this.syncInterval = setInterval(() => {
            this.reload();
        }, this.syncIntervalSeconds * 1000);
        this.reload();

        this.rmmapi.getContactsSettings().subscribe(settings => {
            console.log('Settings:', settings);
            this.settingsSubject.next(settings);
            this.settingsSubject.complete();
        }, e => this.apiErrorHandler(e));
    }

    apiErrorHandler(e: HttpErrorResponse): void {
        this.errorLog.next(e);
    }

    ngOnDestroy() {
        clearInterval(this.syncInterval);
    }

    processContacts(contacts: Contact[]): void {
        this.contactsSubject.next(contacts);

        const byEmail = {};
        const groups = {};
        for (const c of contacts) {
            for (const cat of c.categories) {
                groups[cat] = true;
            }
            for (const e of c.emails) {
                byEmail[e.value] = c;
            }
        }
        this.contactGroups.next(Object.keys(groups));
        this.contactsByEmail.next(byEmail);
    }

    reload(): Promise<void> {
        console.log('Reloading the contacts list');
        return new Promise((resolve, reject) => {
            this.rmmapi.getAllContacts().subscribe(
                contacts => {
                    console.log('Contacts:', contacts);
                    this.saveCache(contacts);
                    this.processContacts(contacts);
                    this.lastUpdate = moment();
                    resolve();
                },
                e => {
                    this.apiErrorHandler(e);
                    reject();
                }
            );
        });
    }

    saveCache(contacts: Contact[]): void {
        this.storage.set('contactsCache', JSON.stringify(contacts));
    }

    saveContact(contact: Contact): void {
        if (contact.id) {
            console.log('Modifying contact', contact.id);
            this.rmmapi.modifyContact(contact).subscribe(() => {
                this.informationLog.next('Contact modified successfuly');
                console.log('Contact modified');
                this.reload();
            }, e => this.apiErrorHandler(e));
        } else {
            this.rmmapi.addNewContact(contact).subscribe(thecontact => {
                this.informationLog.next('New contact has been created');
                this.reload();
            }, e => this.apiErrorHandler(e));
        }
    }

    deleteContact(contact: Contact, callback: any): Observable<any> {
        console.log('Contact.service deleting', contact.id);
        const deleteResult = this.rmmapi.deleteContact(contact);
        deleteResult.subscribe(() => {
            this.informationLog.next('Contact has been deleted');
            this.reload();
            callback();
        }, e => this.apiErrorHandler(e));
        return deleteResult;
    }

    lookupContact(email: string): Promise<Contact> {
        return new Promise((resolve, reject) => {
            this.contactsByEmail.subscribe(cby => {
                resolve(cby[email]);
            }, e => { this.apiErrorHandler(e); reject(); });
        });
    }

    importContacts(vcf: string): Observable<Contact[]> {
        return this.rmmapi.importContacts(vcf);
    }

    isMigrationPending(): Observable<any> {
        const res = this.rmmapi.isMigrationPending();
        res.subscribe(jobID => {
            if (jobID) {
                console.log(`Migration is pending, installing watcher for #${jobID}`);
                this.installMigrationWatcher(jobID);
            }
        });
        return res;
    }

    installMigrationWatcher(jobID: number): void {
        console.log(`Installing migration watcher for #${jobID}`);
        if (this.migrationWatcher) {
            return;
        }
        this.migrationWatcher = setInterval(() => {
            console.log('Checking status of migration', jobID);
            this.rmmapi.isMigrationPending(jobID).subscribe(
                result => {
                    const status = +result;
                    console.log('Migration status:', status);
                    this.migrationResult.next(status);
                    if (status !== 1) {
                        console.log('Clearing migration watcher');
                        clearInterval(this.migrationWatcher);
                        this.migrationWatcher = null;
                        if (status === 0) {
                            this.informationLog.next('Contact migration has finished');
                            this.reload();
                        } else if (status === 2) {
                            this.informationLog.next('Contact migration has failed. Try again later or contact us at community.runbox.com');
                        }
                    }
                }
            );
        }, 5000);
    }

    migrateContacts(): Observable<any> {
        const result = this.rmmapi.migrateContacts();
        result.subscribe(res => {
            console.log('Contact migration result:', res);
            if (res.status === 'pending') {
                this.installMigrationWatcher(res.result);
                return;
            } else if (res.status === 'ok') {
                this.informationLog.next('Contact migration has been scheduled. This may take some time');
                this.installMigrationWatcher(res.result);
            }
        }, e => this.apiErrorHandler(e));
        return result;
    }
}
