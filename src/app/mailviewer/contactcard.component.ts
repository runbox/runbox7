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

import { Component, Input, OnChanges } from '@angular/core';
import { Router } from '@angular/router';

import { Contact } from '../contacts-app/contact';
import { ContactsService } from '../contacts-app/contacts.service';
import { AppSettingsService } from '../app-settings';

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'rmm7-contact-card',
    template: `
        <span [ngStyle]="{ 'text-decoration': contactsEntry ? 'underline' : '' }">
            <img *ngIf="avatarUrl" style="height: 16px; border-radius: 8px;" [src]="avatarUrl" alt="" />
            {{ contact.name }} &lt;{{ contact.address }}&gt;
            <a [matTooltip]="contactsEntry ? 'Show contact' : 'Add to contacts'" (click)="clicked()">
                <mat-icon style="transform: scale(0.7);" *ngIf="contactsEntry" svgIcon="account"></mat-icon>
                <mat-icon style="transform: scale(0.7);" *ngIf="!contactsEntry" svgIcon="account-plus"></mat-icon>
            </a>
        </span>
    `,
})
export class ContactCardComponent implements OnChanges {
    @Input() contact: any;
    contactsEntry: Contact;
    avatarUrl: string;

    constructor(
        settingsService: AppSettingsService,
        private router: Router,
        private contactsservice: ContactsService,
    ) {
        settingsService.settingsSubject.subscribe(_ => this.ngOnChanges());
    }

    ngOnChanges() {
        // reset these first, so that we don't display anything outdated while things are loading
        this.contactsEntry = this.avatarUrl = null;

        if (this.contact) {
            this.contactsservice.lookupContact(this.contact.address).then(c => this.contactsEntry = c);
            this.contactsservice.lookupAvatar(this.contact.address).then(url => this.avatarUrl = url);
        }
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
