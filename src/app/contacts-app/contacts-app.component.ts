// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2018 Runbox Solutions AS (runbox.com).
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

import { Component } from '@angular/core';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { Router } from '@angular/router';
import { Contact } from './contact';

@Component({
    moduleId: 'angular2/app/contacts-app/',
    // tslint:disable-next-line:component-selector
    selector: 'contacts-app-root',
    templateUrl: './contacts-app.component.html',
})
export class ContactsAppComponent {
    title = 'Contacts';
    contacts: Contact[];
    selectedContact: Contact;

    constructor(
        public rmmapi: RunboxWebmailAPI,
        private router: Router
    ) {
        this.rmmapi.getAllContacts().subscribe(contacts => {
            console.log('Got all the contacts!');
            console.log('Contacts: ' + contacts);
            this.contacts = contacts;
        });
    }

    selectContact(contact: Contact): void {
        this.selectedContact = new Contact(contact);
    }

    newContact(): void {
        this.selectedContact = new Contact({});
    }

    saveContact(contact: Contact): void {
        if (contact.id) { // existing contact
            for (let i = 0; i < this.contacts.length; i++) {
                if (contact.id === this.contacts[i].id) {
                    this.rmmapi.modifyContact(contact).subscribe(() => {
                        console.log('Contact modified');
                    });
                    this.contacts[i] = contact;
                    break;
                }
            }
            this.selectContact(contact);
        } else { // new contact
            this.rmmapi.addNewContact(contact).subscribe(thecontact => {
                console.log('ID assigned: ' + thecontact.id);
                this.contacts.push(thecontact);
                this.selectContact(thecontact);
            });
        }
    }

    rollbackContact(contact: Contact): void {
        this.selectContact(this.getContact(contact.id));
    }

    getContact(id: number): Contact {
        for (const c of this.contacts) {
            if (c.id === id) {
                return c;
            }
        }
    }

}
