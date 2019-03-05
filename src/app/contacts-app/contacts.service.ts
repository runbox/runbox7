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
