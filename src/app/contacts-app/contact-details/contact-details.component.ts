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
import { MatDialog } from '@angular/material';
import { Router } from '@angular/router';
import { RunboxWebmailAPI } from '../../rmmapi/rbwebmail';
import { Contact, Email } from '../contact';
import { ConfirmDialog } from '../../dialog/dialog.module';

import { filter, mergeMap } from 'rxjs/operators';

@Component({
    selector: 'app-contact-details',
    templateUrl: './contact-details.component.html',
})
export class ContactDetailsComponent implements OnChanges {
    @Input() contact: Contact;

    ngOnChanges(changes: any) {
        console.log("Input changed!");
        if (!this.contact) {
            console.log("...to nothing");
            return;
        }
        console.log("Contact is now:", this.contact);

        this.contactForm = this.createForm();

        // need to prevent ReactiveForms from shitting themvelses on null arrays
        if (this.contact.emails === null) {
            this.contact.emails = [];
        }

        // prepare room in the form for all the emails,
        for (var i = 0; i < this.contact.emails.length; i++) {
            var emailsFA = this.contactForm.get('emails') as FormArray;
            var emailFG = this.createEmailFG();
            emailsFA.push(emailFG);

            // also fixup empty types for the same reason as above
            var e = this.contact.emails[i];
            if (e.types === null) {
                e.types = [];
            }

            for (var j = 0; j < e.types.length; j++) {
                var typesFA = emailFG.get('types') as FormArray;
                typesFA.push(this.fb.control());
            }
        }

        if (this.contact.rmm_backed === true) {
            this.contactForm.disable();
        }

        this.contactForm.patchValue(this.contact);
    }

    @Output() contactSaved = new EventEmitter<Contact>();
    @Output() contactDeleted = new EventEmitter<Contact>();

    contactForm = this.createForm();

    constructor(
        public dialog: MatDialog,
        public rmmapi: RunboxWebmailAPI,
        private fb: FormBuilder,
        private router: Router
    ) {
    }

    createForm(): FormGroup {
        return this.fb.group({
            id:         this.fb.control(''),
            nickname:   this.fb.control(''),
            first_name: this.fb.control(''),
            last_name:  this.fb.control(''),
            emails: this.fb.array([
            ]),
            birthday:   this.fb.control(''),
            note:       this.fb.control(''),
        });
    }

    save(): void {
        this.contact = new Contact(this.contactForm.value);
        console.log("Saving contact:", this.contact);
        this.contactSaved.next(this.contact);
    }

    rollback(): void {
        // let's pretend we just got clicked with the same data as before
        this.ngOnChanges({});
    }

    createEmailFG(types = [], value = ''): FormGroup {
        return this.fb.group({
            types: this.fb.array(types),
            value: this.fb.control(value),
        })
    }

    newEmail(): void {
        var emails = this.contactForm.get('emails') as FormArray;
        emails.push(this.createEmailFG());
    }

    removeEmailAt(i: number): void {
        var emails = this.contactForm.get('emails') as FormArray;
        emails.removeAt(i);
    }

    addTypeToEmail(i: number): void {
        var emails = this.contactForm.get('emails') as FormArray;
        var types  = emails.at(i).get('types') as FormArray;
        types.push(this.fb.control(''));
    }

    delete(): void {
        var confirmDialog = this.dialog.open(ConfirmDialog);
        confirmDialog.componentInstance.title = `Delete this contact?`;
        confirmDialog.componentInstance.question =
            `Are you sure that you want to delete this contact?`;
        confirmDialog.componentInstance.noOptionTitle = 'no';
        confirmDialog.componentInstance.yesOptionTitle = 'yes';
        confirmDialog.afterClosed().pipe(
            filter(res => res === true),
            mergeMap(() => this.rmmapi.deleteContact(this.contact))
        ).subscribe(() => {
            this.contactDeleted.next(this.contact);
            this.router.navigateByUrl('/contacts/');
        });
    }
}
