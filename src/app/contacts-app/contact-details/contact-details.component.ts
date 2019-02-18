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

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { RunboxWebmailAPI } from '../../rmmapi/rbwebmail';
import { Contact, Email } from '../contact';

@Component({
    selector: 'app-contact-details',
    templateUrl: './contact-details.component.html',
})
export class ContactDetailsComponent {
    @Input() contact: Contact;

    @Output() contactSaved = new EventEmitter<Contact>();
    @Output() contactDiscarded = new EventEmitter<Contact>();

    constructor(
        public rmmapi: RunboxWebmailAPI,
        private router: Router
    ) {
    }

    save(): void {
        this.contactSaved.next(this.contact);
    }

    rollback(): void {
        this.contactDiscarded.next(this.contact);
    }

    newEmail(): void {
        this.contact.emails.push(new Email())
    }
}
