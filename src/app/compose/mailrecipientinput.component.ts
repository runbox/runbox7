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

import { Component, Input, EventEmitter, Output, OnChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { MatAutocomplete } from '@angular/material/autocomplete';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ENTER } from '@angular/cdk/keycodes';
import { debounceTime } from 'rxjs/operators';
import { RecipientsService } from './recipients.service';
import { Recipient } from './recipient';
import { MailAddressInfo } from '../common/mailaddressinfo';
import { isValidEmailArray } from './emailvalidator';

const COMMA = 188;

@Component({
    moduleId: 'angular2/app/compose/',
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'mailrecipient-input',
    templateUrl: 'mailrecipientinput.component.html'
})
export class MailRecipientInputComponent implements OnChanges, AfterViewInit {
    filteredRecipients: BehaviorSubject<Recipient[]> = new BehaviorSubject([]);

    searchTextFormControl: UntypedFormControl = new UntypedFormControl();
    recipientsList: MailAddressInfo[];

    separatorKeysCodes = [COMMA, ENTER];

    addedFromAutoComplete = false;
    invalidemail = false;

    @Input() recipients: MailAddressInfo[];
    @Input() placeholder: string;
    @Input() initialfocus = false;

    @Output() updateRecipient: EventEmitter<MailAddressInfo[]> = new EventEmitter();

    @ViewChild('searchTextInput') searchTextInput: ElementRef;
    @ViewChild('auto') auto: MatAutocomplete;

    constructor(
        private snackBar: MatSnackBar,
        recipientservice: RecipientsService
    ) {
        recipientservice.recipients.subscribe((recipients) => {

        // Listen to search text input and popup suggestions from recipient list
        this.searchTextFormControl.valueChanges
            .pipe(debounceTime(50))
            .subscribe((searchtext: string | Recipient) => {
                if (searchtext) {
                    const lowercaseSearchText = searchtext.toString().toLowerCase();
                    this.filteredRecipients.next(
                        recipients.filter(recipient =>
                            recipient.name.toLowerCase().indexOf(lowercaseSearchText) > -1
                        )
                    );
                } else {
                    this.filteredRecipients.next([]);
                }
            }
            );
        });
    }

    ngOnChanges() {
        // now a list of MailAddressInfo objects
        this.recipientsList = this.recipients ? this.recipients : [];
    }

    ngAfterViewInit() {
        if (this.initialfocus) {
            this.searchTextInput.nativeElement.focus();
        }
    }

    notifyChangeListener() {
        this.updateRecipient.emit(this.recipientsList);
    }

    removeRecipient(ndx: number) {
        this.recipientsList.splice(ndx, 1);
        this.notifyChangeListener();
        this.invalidemail = false;
    }

    addRecipientFromAutoComplete(recipient: Recipient) {
        this.invalidemail = false;
        this.addedFromAutoComplete = true;

        const recipientCount = recipient.toStringList().length;

        if (recipientCount > 1) {
            const recipientsListBackup = this.recipientsList.slice();

            this.snackBar.open(
                recipientCount + ' contacts added to recipient list',
                'Undo', { duration: 3000 }
            ).onAction().subscribe(() => {
                this.recipientsList = recipientsListBackup;
            });
        }

        // FIXME: If we could push/concat an array we could skip this loop:
        for (const r of recipient.toStringList()) {
            this.recipientsList.push(MailAddressInfo.parse(r)[0]);
        }

        this.notifyChangeListener();
        this.searchTextInput.nativeElement.value = '';
    }

    addRecipientFromBlur() {
        const input = this.searchTextInput.nativeElement;
        const value = (input.value || '').trim();

        if (this.auto.isOpen || this.addedFromAutoComplete) {
            this.addedFromAutoComplete = false;
            return;
        }
        if (value) {
            this.addRecipient(input);
            this.addedFromAutoComplete = false;
            return;
        }
        this.invalidemail = false;
    }

    addRecipientFromEnter(event: MatChipInputEvent) {
        const input = event.input;
        const value = (input.value || '').trim();

        if (this.addedFromAutoComplete) {
            return;
        }
        if (value) {
            this.addRecipient(input);
            this.addedFromAutoComplete = false;
            return;
        }
        this.invalidemail = false;
    }

    addRecipient(input) {
        const value = input.value;
        // Parse input into email-like things:
        const parsedEmails = MailAddressInfo.parse(value);

        // Then validate the parts
        if (!isValidEmailArray(parsedEmails)) {
            this.invalidemail = true;
        } else {
            this.invalidemail = false;
            this.recipientsList = this.recipientsList.concat(parsedEmails);
            input.value = '';
            this.notifyChangeListener();
        }
    }
}
