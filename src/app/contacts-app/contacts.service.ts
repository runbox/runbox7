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

import { ContactSyncResult, RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { StorageService } from '../storage.service';
import { Contact } from './contact';
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { AsyncSubject, Observable, Subject, ReplaySubject } from 'rxjs';
import { take } from 'rxjs/operators';
import * as moment from 'moment';

@Injectable()
export class ContactsService implements OnDestroy {
    settingsSubject    = new AsyncSubject<any>();
    contactsSubject    = new ReplaySubject<Contact[]>(1);
    contactsByEmail    = new ReplaySubject<any>(1);
    contactCategories  = new ReplaySubject<string[]>(1);
    informationLog     = new Subject<string>();
    errorLog           = new Subject<HttpErrorResponse>();
    migrationResult    = new Subject<number>();

    migrationWatcher: any;

    syncInterval: any;
    syncIntervalSeconds = 180;
    syncToken: string;
    lastUpdate: moment.Moment;

    constructor(
        private rmmapi: RunboxWebmailAPI,
        private storage: StorageService,
    ) {
        storage.get('contactsCache').then(cache => {
            if (!cache || typeof cache !== 'object' || cache.version !== 2) {
                return;
            }
            const contacts = cache.contacts.map((c: any) => new Contact(c));
            this.syncToken = cache.syncToken;
            this.processContacts(contacts);
        }).finally(() => {
            this.syncInterval = setInterval(() => {
                this.reload();
            }, this.syncIntervalSeconds * 1000);
            this.reload();
        });

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

        const byEmail    = {};
        const categories = {};
        for (const c of contacts) {
            for (const cat of c.categories) {
                categories[cat] = true;
            }
            for (const e of c.emails) {
                byEmail[e.value] = c;
            }
        }
        this.contactCategories.next(Object.keys(categories));
        this.contactsByEmail.next(byEmail);
        this.saveCache(contacts);
        this.lastUpdate = moment();
    }

    reload(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.rmmapi.syncContacts(this.syncToken).subscribe(
                (syncResult: ContactSyncResult) => {
                    if (!this.syncToken) {
                        // initial sync. Grab whatever's in .added and call it a day
                        this.syncToken = syncResult.newSyncToken;
                        this.processContacts(syncResult.added);
                        resolve();
                    // Check for syncResult.added even if the syncToken is the same,
                    // since it may contain RMM6 contacts: they don't come from DAV
                    // so they don't have their own syncToken, but they still need to be picked up.
                    } else if (this.syncToken === syncResult.newSyncToken && syncResult.added.length === 0) {
                        // everything up-to-date, nothing to do
                        resolve();
                    } else {
                        // not our first rodeo: take the current list and update it
                        this.contactsSubject.pipe(take(1)).subscribe(currentContacts => {
                            const contactsByID: { [key: string]: Contact } = {};
                            for (const c of currentContacts) {
                                contactsByID[c.id] = c;
                            }
                            for (const id of syncResult.removed) {
                                delete contactsByID[id];
                            }
                            for (const c of syncResult.added) {
                                contactsByID[c.id] = c;
                            }

                            const newContacts = Object.values(contactsByID);

                            this.syncToken = syncResult.newSyncToken;
                            this.processContacts(newContacts);
                            resolve();
                        });
                    }
                },
                e => {
                    this.apiErrorHandler(e);
                    reject();
                }
            );
        });
    }

    saveCache(contacts: Contact[]): void {
        this.storage.set('contactsCache', {
            contacts:  contacts,
            syncToken: this.syncToken,
            version:   2,
        });
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

    deleteContact(contact_id: string): Promise<void> {
        console.log('Contact.service deleting', contact_id);
        return new Promise<void>((resolve, reject) => {
            this.rmmapi.deleteContact(contact_id).subscribe(() => {
                resolve();
            }, e => {
                this.apiErrorHandler(e);
                reject();
            });
        });
    }

    deleteMultiple(contact_ids: string[]): Promise<void[]> {
        return Promise.all(contact_ids.map(id => this.deleteContact(id)));
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
