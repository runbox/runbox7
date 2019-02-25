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
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
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
    navigationSubscription;

    MOCK_CONTACTS = [{"phones":[],"company":null,"emails":[],"urls":[],"birthday":"","last_name":"Testowy","department":null,"nick":"Test","first_name":"Jan","id":"1570E6D0-3363-11E9-A33A-51B2B65D14DE","note":"","addresses":[]},{"department":null,"nick":"test","birthday":"","urls":[],"last_name":"Test","company":null,"emails":[],"phones":[],"note":"","addresses":[],"first_name":"Jan","id":"CF49CBB2-3363-11E9-BC8E-37B3B65D14DE"},{"department":null,"nick":"Bzik","last_name":"Zbzikowana","birthday":"","urls":[],"emails":[{"types":null,"value":"bara@bara.com"}],"company":null,"phones":[],"addresses":[],"note":"","id":"3ABD9AC2-3364-11E9-BC8E-37B3B65D14DE","first_name":"Barbara"},{"department":null,"nick":null,"urls":[],"birthday":"","last_name":"Superbzik","company":null,"emails":[{"value":"bara2@bara.com","types":null},{"types":null,"value":"bara2@bara.com"},{"types":null,"value":"bara2@bara.com"},{"types":null,"value":"superbara@bara.com"},{"value":"praca@barabara.com","types":[]}],"phones":[],"note":"","addresses":[],"first_name":"Barabara","id":"50362E58-3609-11E9-87A6-847CB65D14DE"}];

    constructor(
        public rmmapi: RunboxWebmailAPI,
        private route: ActivatedRoute,
        private router: Router
    ) {
    }

    ngOnInit(): void {
        console.log("Setting navigation hook");
        this.navigationSubscription = this.router.events.subscribe((e: any) => {
            if (e instanceof NavigationEnd) {
                console.log("NAVIGATION");
                this.onContactsReady();
            }
        });

        if (false) {
            this.contacts = [];
            for (var c of this.MOCK_CONTACTS) {
                this.contacts.push(new Contact(c));
            }
            console.log("\n\nCONTACTS MOCKED\n\n\n");
        } else {
            console.log("Fetching contacts from the backend");
            this.rmmapi.getAllContacts().subscribe(contacts => {
                console.log('Got all the contacts!');
                console.log('Contacts: ' + contacts);
                this.contacts = contacts;
                this.onContactsReady();
            });
        }
    }

    ngOnDestroy() {
        if (this.navigationSubscription) {
           this.navigationSubscription.unsubscribe();
        }
    }

    onContactsReady() {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            this.selectedContact = null;
        } else if (id === "new") {
            this.selectedContact = new Contact({});
        } else {
            var contact = this.getContact(id);
            this.selectedContact = new Contact(contact);
        }
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
            this.navigateTo(contact);
        } else { // new contact
            this.rmmapi.addNewContact(contact).subscribe(thecontact => {
                console.log('ID assigned: ' + thecontact.id);
                this.contacts.push(thecontact);
                this.navigateTo(thecontact);
            });
        }
    }

    navigateTo(contact: Contact): void {
        this.router.navigateByUrl('/contact/' + contact.id);
    }

    getContact(id: string): Contact {
        for (const c of this.contacts) {
            if (c.id === id) {
                return c;
            }
        }
    }

}
