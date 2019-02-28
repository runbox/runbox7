import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { Contact } from './contact';
import { Injectable } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';
import { first } from 'rxjs/operators';

@Injectable()
export class ContactsService {

    contactsSubject = new ReplaySubject<Contact[]>();

    constructor(
        private rmmapi: RunboxWebmailAPI
    ) {
        this.reload();
    }

    reload(): void {
        console.log("Reloading the contacts list");
        this.rmmapi.getAllContacts().subscribe(contacts => {
            console.log('Got all the contacts!');
            console.log('Contacts:', contacts);
            this.contactsSubject.next(contacts);
        });
    }

    saveContact(contact: Contact): void {
        this.contactsSubject.pipe(first()).subscribe((contacts: Contact[]) => {
            if (contact.id) {
                console.log('Modifying contact', contact.id);
                let existing = contacts.find(c => c.id === contact.id);
                if (existing) {
                    console.log("Sending contact: ", contact);
                    this.rmmapi.modifyContact(contact).subscribe(() => {
                        console.log('Contact modified');
                        this.reload();
                    });
                }
            } else {
                console.log("Creating new contact");
                this.rmmapi.addNewContact(contact).subscribe(thecontact => {
                    console.log('ID assigned: ' + thecontact.id);
                    this.reload();
                });
            }
        });
    }

    deleteContact(contact: Contact, callback: any): Observable<any> {
        console.log("Contact.service deleting", contact.id);
        let deleteResult = this.rmmapi.deleteContact(contact);
        deleteResult.subscribe(() => {
            console.log("Contact deleted, reloading the list");
            this.reload();
            callback();
        });
        return deleteResult;
    }
}
