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
import { Contact } from './contact';
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AsyncSubject, Observable, Subject, ReplaySubject } from 'rxjs';
import { first } from 'rxjs/operators';

@Injectable()
export class ContactsService {

    settingsSubject = new AsyncSubject<any>();
    contactsSubject = new ReplaySubject<Contact[]>();
    contactsByEmail = new ReplaySubject<any>(1);
    contactGroups   = new ReplaySubject<string[]>();
    informationLog  = new Subject<string>();
    errorLog        = new Subject<HttpErrorResponse>();
    migrationResult = new Subject<number>();

    migrationWatcher: any;

    constructor(
        private rmmapi: RunboxWebmailAPI
    ) {
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

    reload(): Observable<any> {
        console.log('Reloading the contacts list');
        const res = this.rmmapi.getAllContacts();
        const byEmail = {};
        res.subscribe(contacts => {
            console.log('Contacts:', contacts);
            this.contactsSubject.next(contacts);

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
        }, e => this.apiErrorHandler(e));
        return res;
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
        res.subscribe(status => {
            console.log(status);
            if (status === 1) {
                console.log('Migration is pending, installing migration watcher');
                this.installMigrationWatcher();
            }
        });
        return res;
    }

    installMigrationWatcher(): void {
        if (this.migrationWatcher) {
            return;
        }
        this.migrationWatcher = setInterval(() => {
            this.rmmapi.isMigrationPending().subscribe(
                status => {
                    this.migrationResult.next(status);
                    if (status !== 1) {
                        clearInterval(this.migrationWatcher);
                        this.migrationWatcher = null;
                        if (status === 0) {
                            this.informationLog.next('Contact migration has finished');
                        } else if (status === 2) {
                            this.informationLog.next('Contact migration has failed. Try again later or contact us at community.runbox.com');
                        }
                    }
                }
            );
        }, 5000);
    }

    migrateContacts(): Observable<any> {
        const res = this.rmmapi.migrateContacts();
        res.subscribe(status => {
            console.log('Contact migration status:', status);
            this.informationLog.next('Contact migration has been scheduled. This may take some time');
            this.installMigrationWatcher();
        }, e => this.apiErrorHandler(e));
        return res;
    }
}
