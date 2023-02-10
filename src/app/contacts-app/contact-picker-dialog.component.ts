// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2020 Runbox Solutions AS (runbox.com).
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

import { Component, Inject } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { Contact } from './contact';

@Component({
    selector: 'app-contact-picker-dialog',
    template: `
<h1 mat-dialog-title>
    {{ title }}
</h1>

<div mat-dialog-content>
    <mat-nav-list dense>
        <mat-list-item *ngFor="let contact of contacts">
            <button mat-flat-button
                [color]="selectedIDs[contact.id] ? 'primary' : ''"
                (click)="selectContact(contact)"
            >
                <app-contact-button [contact]="contact" ></app-contact-button>
            </button>
        </mat-list-item>
    </mat-nav-list>
</div>

<div mat-dialog-actions style="justify-content: flex-begin;">
    <button mat-button (click)="onCancelClick()">
        Cancel
    </button>

    <button mat-raised-button color="primary" *ngIf="selectedCount > 0"
        (click)="onSubmitClick()"
    >
        Select these {{ selectedCount }} contacts
    </button>
</div>
`,
})
export class ContactPickerDialogComponent {
    title: string;
    contacts: Contact[];
    selectedIDs: { [id: string ]: boolean } = {};
    selectedCount = 0;

    constructor(
        private dialogRef: MatDialogRef<ContactPickerDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.title = data['title'];
        this.contacts = data['contacts'];
    }

    onCancelClick(): void {
        this.dialogRef.close();
    }

    onSubmitClick() {
        const selectedContacts = [];
        for (const key of Object.keys(this.selectedIDs)) {
            if (this.selectedIDs[key]) {
                selectedContacts.push(key);
            }
        }

        this.dialogRef.close({ selectedContacts });
    }

    selectContact(contact: Contact) {
        this.selectedIDs[contact.id] = !this.selectedIDs[contact.id];
        this.selectedCount = Object.values(this.selectedIDs).filter(x => x).length;
    }
}
