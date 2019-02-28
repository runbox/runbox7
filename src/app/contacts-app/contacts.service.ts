import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { Contact } from './contact';
import { Injectable } from '@angular/core';
import { Observable, Subject, ReplaySubject } from 'rxjs';
import { first } from 'rxjs/operators';

@Injectable()
export class ContactsService {

    contactsSubject = new ReplaySubject<Contact[]>();
    informationLog  = new Subject<string>();

    constructor(
        private rmmapi: RunboxWebmailAPI
    ) {
        this.reload();
    }

    reload(): void {
        console.log('Reloading the contacts list');
        this.rmmapi.getAllContacts().subscribe(contacts => {
            console.log('Contacts:', contacts);
            this.contactsSubject.next(contacts);
        });
    }

    saveContact(contact: Contact): void {
        if (contact.id) {
            console.log('Modifying contact', contact.id);
            this.rmmapi.modifyContact(contact).subscribe(() => {
                this.informationLog.next('Contact modified successfuly');
                console.log('Contact modified');
                this.reload();
            });
            console.log('Request sent');
        } else {
            console.log('Creating new contact');
            this.rmmapi.addNewContact(contact).subscribe(thecontact => {
                this.informationLog.next('New contact has been created');
                console.log('ID assigned: ' + thecontact.id);
                this.reload();
            });
        }
    }

    deleteContact(contact: Contact, callback: any): Observable<any> {
        console.log('Contact.service deleting', contact.id);
        const deleteResult = this.rmmapi.deleteContact(contact);
        deleteResult.subscribe(() => {
            this.informationLog.next('Contact has been deleted');
            console.log('Contact deleted, reloading the list');
            this.reload();
            callback();
        });
        return deleteResult;
    }
}
