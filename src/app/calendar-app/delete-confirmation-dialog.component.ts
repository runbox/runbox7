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
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
    selector: 'app-calendar-delete-confirmation-dialog',
    template: `
<h2 mat-dialog-title>Delete “{{ data.name }}”</h2>
<mat-dialog-content>
    <p>
        Are you sure you want to delete “{{ data.name }}“?
    </p>
</mat-dialog-content>
<mat-dialog-actions>
  <button mat-button mat-dialog-close>No</button>
  <button mat-button [mat-dialog-close]="true">Yes</button>
</mat-dialog-actions>
   `
})
export class DeleteConfirmationDialogComponent {
    constructor(
        private dialog: MatDialog,
        public dialogRef: MatDialogRef<DeleteConfirmationDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
    }
}

@Component({
    selector: 'app-calendar-delete-confirmation-recurring-dialog',
    template: `
<h2 mat-dialog-title>Delete “{{ data.name }}“</h2>
<mat-dialog-content>
    <p> Event “{{ data.name }}” is a recurring event. </p>
    <p> Do you want to delete all occurrences of it, or just this one? </p>
</mat-dialog-content>
<mat-dialog-actions>
  <button mat-button mat-dialog-close>Abort</button>

  <button mat-button (click)="dialogRef.close('all')">All of them</button>
  <button mat-button (click)="dialogRef.close('one')">Just this one</button>
</mat-dialog-actions>
   `
})
export class DeleteConfirmationRecurringDialogComponent {
    constructor(
        private dialog: MatDialog,
        public dialogRef: MatDialogRef<DeleteConfirmationRecurringDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
    }
}
