import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { AsyncSubject } from 'rxjs';
import { Contact } from './contact';
import { Injectable } from '@angular/core';

@Injectable()
export class ContactsService {

    contactsSubject = new AsyncSubject<Contact[]>();

    constructor(
        rmmapi: RunboxWebmailAPI
    ) {
        rmmapi.getAllContacts().subscribe(contacts => {
            console.log('Got all the contacts!');
            console.log('Contacts: ' + contacts);
            this.contactsSubject.next(contacts);
            this.contactsSubject.complete();
        });
    }
}
