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
    selector: 'app-group-picker-dialog-component',
    template: `
<h1 mat-dialog-title>
    Group to import to
</h1>

<div mat-dialog-content>
    <mat-nav-list>
        <mat-list-item *ngFor="let group of groups" (click)="chooseGroup(group)">
            <mat-icon mat-list-icon svgIcon="account-multiple"> </mat-icon> {{ group.full_name }}
        </mat-list-item>
    </mat-nav-list>
</div>

<div mat-dialog-actions style="justify-content: flex-begin;">
    <button mat-button (click)="onCancelClick()">
        Cancel
    </button>
</div>
`,
})
export class GroupPickerDialogComponent {
    groups: Contact[];

    constructor(
        private dialogRef: MatDialogRef<GroupPickerDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.groups = data['groups'];
    }

    onCancelClick(): void {
        this.dialogRef.close();
    }

    chooseGroup(group: Contact) {
        this.dialogRef.close(group);
    }
}
