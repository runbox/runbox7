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

import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { Contact } from '../contacts-app/contact';
import { ContactsService } from '../contacts-app/contacts.service';

@Component({
    // tslint:disable-next-line:component-selector
    selector: 'rmm7-contact-card',
    template: `
        <a [ngStyle]="style" (click)="clicked()"
           [matTooltip]="contactsEntry ? 'Show contact' : 'Add to contacts'">
            {{contact.name}} &lt;{{contact.address}}&gt;
        </a>
    `,
})
export class ContactCardComponent implements OnInit {
    @Input() contact: any;
    contactsEntry: Contact;
    style = { 'border-bottom': '1px dashed' };

    constructor(
        private router: Router,
        private contactsservice: ContactsService,
    ) {
    }

    ngOnInit() {
        this.contactsservice.lookupContact(this.contact.address).then(c => {
            if (c) {
                this.contactsEntry = c;
                this.style['border-bottom'] = '1px solid';
            }
        });
    }

    clicked() {
        if (this.contactsEntry) {
            this.router.navigate(['/contacts/' + this.contactsEntry.id]);
        } else {
            this.router.navigate(
                ['/contacts/new'],
                { queryParams: { name: this.contact.name, email: this.contact.address } }
            );
        }
    }
}
