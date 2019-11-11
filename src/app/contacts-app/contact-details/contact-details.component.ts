// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2019 Runbox Solutions AS (runbox.com).
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

import { Component, ElementRef, EventEmitter, Input, Output, OnChanges, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router, ActivatedRoute } from '@angular/router';
import { RunboxWebmailAPI } from '../../rmmapi/rbwebmail';
import { Contact, Email } from '../contact';
import { ConfirmDialog } from '../../dialog/dialog.module';

import { filter, mergeMap, take, tap } from 'rxjs/operators';
import { ContactsService } from '../contacts.service';

@Component({
    selector: 'app-contact-details',
    templateUrl: './contact-details.component.html',
})
export class ContactDetailsComponent {
    contact: Contact;

    @Output() contactSaved = new EventEmitter<Contact>();
    @Output() contactDeleted = new EventEmitter<Contact>();

    contactForm = this.createForm();

    groups = [];

    newGroupPromptShown = false;
    newGroupValue = '';
    @ViewChild('newGroupInput', { static: false }) newGroupElement: ElementRef;

    constructor(
        public dialog: MatDialog,
        public rmmapi: RunboxWebmailAPI,
        private fb: FormBuilder,
        private router: Router,
        private route: ActivatedRoute,
        private contactsservice: ContactsService
    ) {
        this.route.params.subscribe(params => {
            const contactid = params.id;
            if (contactid === 'new') {
                this.route.queryParams.subscribe(queryParams => this.loadNewContact(queryParams));
            } else if (contactid) {
                this.loadExistingContact(contactid);
            }
        });

        contactsservice.contactGroups.subscribe(groups => this.groups = groups);
    }

    loadExistingContact(id: string): void {
        this.contactsservice.contactsSubject.pipe(take(1)).subscribe(contacts => {
            this.contact = contacts.find(c => c.id === id);
            if (this.contact) {
                this.loadContactForm();
            }
        });
    }

    loadNewContact(params: any): void {
        this.contact = new Contact({});

        if (params.email) {
            this.contact.emails = [
                { types: ['home'], value: params.email }
            ];
        }

        if (params.name) {
            const nameParts = params.name.split(' ');
            if (nameParts.length === 2) {
                // probably "firstName lastName"
                this.contact.first_name = nameParts[0];
                this.contact.last_name = nameParts[1];
            } else {
                // no clue
                this.contact.nickname = params.name;
            }
        }

        this.loadContactForm();
    }

    loadContactForm(): void {
        this.contactForm = this.createForm();

        // need to prevent ReactiveForms from shitting themvelses on null arrays
        if (this.contact.emails === null) {
            this.contact.emails = [];
        }

        // prepare room in the form for all the emails, addresses etc
        this.initializeFormArray('emails',    () => this.createEmailFG());
        this.initializeFormArray('addresses', () => this.createAdrFG());

        // no typo, they're just like emails: types and a string value
        this.initializeFormArray('urls',      () => this.createEmailFG());
        this.initializeFormArray('phones',    () => this.createEmailFG());
        this.initializeFormArray('related',   () => this.createEmailFG());

        if (this.contact.rmm_backed === true) {
            console.log('Disabling edits for', this.contact.display_name());
            this.contactForm.disable();
        } else {
            console.log('Enabling edits for', this.contact.display_name());
            this.contactForm.enable();
        }

        this.contactForm.patchValue(this.contact);
    }

    createForm(): FormGroup {
        return this.fb.group({
            id:         this.fb.control(''),
            nickname:   this.fb.control(''),
            first_name: this.fb.control(''),
            last_name:  this.fb.control(''),
            company:    this.fb.control(''),
            department: this.fb.control(''),
            birthday:   this.fb.control(''),
            note:       this.fb.control(''),
            categories: this.fb.control(''),

            emails:    this.fb.array([]),
            phones:    this.fb.array([]),
            addresses: this.fb.array([]),
            urls:      this.fb.array([]),
            related:   this.fb.array([]),
        });
    }

    initializeFormArray(property, formGroupCreator): void {
        for (let i = 0; i < this.contact[property].length; i++) {
            const formArray = this.contactForm.get(property) as FormArray;
            const formGroup = formGroupCreator();
            formArray.push(formGroup);

            // also fixup empty types for the same reason as above
            const e = this.contact[property][i];
            if (e.types === null) {
                e.types = [''];
            }

            for (let j = 0; j < e.types.length; j++) {
                const typesFA = formGroup.get('types') as FormArray;
                typesFA.push(this.fb.control(null));
            }
        }
    }

    createEmailFG(types = []): FormGroup {
        return this.fb.group({
            types: this.fb.array(types),
            value: this.fb.control(''),
        });
    }

    createAdrFG(types = []): FormGroup {
        return this.fb.group({
            types: this.fb.array(types),
            value: this.fb.group({
                street:      this.fb.control(''),
                city:        this.fb.control(''),
                region:      this.fb.control(''),
                post_code:   this.fb.control(''),
                country:     this.fb.control(''),
            }),
        });
    }

    addFGtoFA(fg: FormGroup, faName: string): void {
        const fa = this.contactForm.get(faName) as FormArray;
        fa.push(fg);
    }

    newEmail():    void { this.addFGtoFA(this.createEmailFG(['']), 'emails');    }
    newAdr():      void { this.addFGtoFA(this.createAdrFG(['']),   'addresses'); }
    newPhone():    void { this.addFGtoFA(this.createEmailFG(['']), 'phones');    }
    newUrl():      void { this.addFGtoFA(this.createEmailFG(['']), 'urls');      }
    newRelative(): void { this.addFGtoFA(this.createEmailFG(['']), 'related');   }

    save(): void {
        this.contact = new Contact(this.contactForm.value);
        console.log('Saving contact:', this.contact);
        this.contactsservice.saveContact(this.contact);
    }

    rollback(): void {
        this.router.navigateByUrl('/contacts/' + this.contact.id);
    }

    delete(): void {
        const confirmDialog = this.dialog.open(ConfirmDialog);
        confirmDialog.componentInstance.title = `Delete this contact?`;
        confirmDialog.componentInstance.question =
            `Are you sure that you want to delete this contact?`;
        confirmDialog.componentInstance.noOptionTitle = 'no';
        confirmDialog.componentInstance.yesOptionTitle = 'yes';
        confirmDialog.afterClosed().pipe(
            filter(res => res === true)
        ).subscribe(() => {
            this.contactsservice.deleteContact(this.contact, () => {
                console.log('Contact deleted');
                this.router.navigateByUrl('/contacts/');
            });
        });
    }

    edit_rmm6(): void {
        const return_url = '/contacts/' + this.contact.id;
        window.open(
            '/mail/addresses_contacts?edit=1' +
            '&cid=' + this.contact.get_rmm_id() +
            '&return_url=' + return_url,
            '_blank'
        );
    }

    showNewGroupPrompt(): void {
        // clear the newly added 'undefined' from categories input
        let categories = this.contactForm.get('categories').value;
        categories = categories.filter(c => c);
        this.contactForm.get('categories').setValue(categories);

        this.newGroupPromptShown = true;
        setTimeout(() => this.newGroupElement.nativeElement.focus());
    }

    confirmNewGroup(): void {
        this.groups.push(this.newGroupValue);

        const categories = this.contactForm.get('categories').value;
        categories.push(this.newGroupValue);
        this.contactForm.get('categories').setValue(categories);

        this.newGroupValue = '';
        this.newGroupPromptShown = false;
    }
}
