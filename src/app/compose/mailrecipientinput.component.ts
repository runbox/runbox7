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

import { Component, Input, EventEmitter, Output, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { SearchService } from '../xapian/searchservice';
import { BehaviorSubject } from 'rxjs';
import { MatChipInputEvent, MatAutocomplete } from '@angular/material';
import { ENTER } from '@angular/cdk/keycodes';
import { debounceTime } from 'rxjs/operators';

const COMMA = 188;

@Component({
    moduleId: 'angular2/app/compose/',
    // tslint:disable-next-line:component-selector
    selector: 'mailrecipient-input',
    templateUrl: 'mailrecipientinput.component.html'
})
export class MailRecipientInputComponent implements OnInit, AfterViewInit {
    filteredRecipients: BehaviorSubject<string[]> = new BehaviorSubject([]);

    searchTextFormControl: FormControl = new FormControl();
    recipientsList: string[] = [];

    separatorKeysCodes = [COMMA, ENTER];

    addedFromAutoComplete = false;
    invalidemail = false;

    @Input() recipients: string;
    @Input() placeholder: string;
    @Input() initialfocus = false;

    @Output() change: EventEmitter<string> = new EventEmitter();

    @ViewChild('searchTextInput') searchTextInput: ElementRef;
    @ViewChild('auto') auto: MatAutocomplete;

    constructor(public searchService: SearchService) {
        this.searchService.initSubject.subscribe(() => {
        window['termlistresult'] = [];
        searchService.api.termlist('XRECIPIENT:');
        const recipients: string[] = window['termlistresult'];

        this.searchTextFormControl.valueChanges
            .pipe(debounceTime(50))
            .subscribe((searchtext: string) => {
                if (searchtext) {
                    const lowercaseSearchText = searchtext.toLowerCase();
                    this.filteredRecipients.next(
                        recipients.filter(recipient =>
                            recipient.toLowerCase().indexOf(lowercaseSearchText) > -1
                        )
                    );
                } else {
                    this.filteredRecipients.next([]);
                }
            }
            );
        });
    }

    ngOnInit() {
        this.recipientsList = this.recipients ?
            this.recipients.split(',').map((recipient) => recipient.trim()) :
            [];
    }

    ngAfterViewInit() {
        if (this.initialfocus) {
            this.searchTextInput.nativeElement.focus();
        }
    }

    notifyChangeListener() {
        this.change.emit(this.recipientsList.join(','));
    }

    removeRecipient(ndx: number) {
        this.recipientsList.splice(ndx, 1);
        this.notifyChangeListener();
        this.invalidemail = false;
    }


    addRecipientFromAutoComplete(recipient: string) {
        this.invalidemail = false;
        this.addedFromAutoComplete = true;
        this.recipientsList.push(recipient);
        this.notifyChangeListener();
        this.searchTextInput.nativeElement.value = '';
    }

    addRecipientFromBlur() {
        const input = this.searchTextInput.nativeElement;
        const value = (input.value || '').trim();

        if (!this.auto.isOpen && this.searchTextFormControl.valid) {
            this.invalidemail = false;

            if (value) {
                this.recipientsList.push(value);
                this.notifyChangeListener();
                input.value = '';
            }
        } else if (value && !this.searchTextFormControl.valid) {
            this.invalidemail = true;
        } else {
            this.invalidemail = false;
        }
    }

    addRecipient(event: MatChipInputEvent) {
        const input = event.input;
        const value = (input.value || '').trim();
        input.value = '';

        if (value && this.searchTextFormControl.valid && !this.addedFromAutoComplete) {
            this.invalidemail = false;
            this.recipientsList.push(value);
            this.notifyChangeListener();
        } else if (!this.addedFromAutoComplete && !this.searchTextFormControl.valid) {
            this.invalidemail = true;
        }

        this.addedFromAutoComplete = false;
    }
}
