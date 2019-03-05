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
    informationLog  = new Subject<string>();
    errorLog        = new Subject<HttpErrorResponse>();

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

    reload(): void {
        console.log('Reloading the contacts list');
        this.rmmapi.getAllContacts().subscribe(contacts => {
            console.log('Contacts:', contacts);
            this.contactsSubject.next(contacts);
        }, e => this.apiErrorHandler(e));
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

    migrateContacts(): Observable<any> {
        const res = this.rmmapi.migrateContacts();
        res.subscribe(() => {
            this.informationLog.next('Contacts have been migrated');
            this.reload();
        }, e => this.apiErrorHandler(e));
        return res;
    }
}
