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

import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { RunboxWebmailAPI } from '../../rmmapi/rbwebmail';
import { Contact, Email } from '../contact';

@Component({
    selector: 'app-contact-details',
    templateUrl: './contact-details.component.html',
})
export class ContactDetailsComponent implements OnChanges {
    @Input() contact: Contact;

    ngOnChanges(changes: any) {
        if (!this.contact) {
            return;
        }
        console.log("Input changed, contact is now:");
        console.log(this.contact);

        var emails = this.contactForm.get('emails') as FormArray;
        console.log("Deleting", emails.length, "existing email form controls");
        for (var i = 0; i < emails.length; i++) {
            emails.removeAt(0);
        }

        // need to prevent ReactiveForms from shitting themvelses on null arrays
        if (this.contact.emails === null) {
            this.contact.emails = [];
        }
        for (var i = 0; i < this.contact.emails.length; i++) {
            var e = this.contact.emails[i];
            if (e.types === null) {
                e.types = [];
            }
        }

        this.contactForm.patchValue(this.contact);

        // patchValue is incapable of patching arrays,
        // so we gotta do that manually :/
        console.log("Have to add", this.contact.emails.length, "email fields");
        for (var i = 0; i < this.contact.emails.length; i++) {
            console.log("Iteration", i);
            var e = this.contact.emails[i];
            var email = this.createEmailFG(e.types, e.value);
            console.log("Adding email: ", e.value);
            emails.push(email);
        }
    }

    @Output() contactSaved = new EventEmitter<Contact>();
    @Output() contactDiscarded = new EventEmitter<Contact>();

    contactForm = this.fb.group({
        id:         [''],
        nick:       [''],
        first_name: [''],
        last_name:  [''],
        emails: this.fb.array([
            this.createEmailFG()
        ]),
        birthday:   [''],
        note:       [''],
    });

    constructor(
        public rmmapi: RunboxWebmailAPI,
        private fb: FormBuilder,
        private router: Router
    ) {
    }

    save(): void {
        this.contact = new Contact(this.contactForm.value);
        this.contactSaved.next(this.contact);
    }

    rollback(): void {
        this.contactDiscarded.next(this.contact);
    }

    createEmailFG(types = [''], value = ''): FormGroup {
        return this.fb.group({
            types: this.fb.array(types),
            value: value,
        })
    }

    newEmail(): void {
        var emails = this.contactForm.get('emails') as FormArray;
        emails.push(this.createEmailFG());
    }
}
