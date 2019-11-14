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

import { Component, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
    selector: 'app-event-reporting-dialog',
    template: `
<h1 mat-dialog-title>Error</h1>
<div mat-dialog-content>
    <p>
        There was an error when trying to perform an action
        <span style="font-family: monospace;">{{ action }}</span>
    </p>
    <p>
        It's not your fault: something went wrong with our server.
    </p>
    <p>
        If you want, you can provide us with some details here
        so that we'll have an easier time figuring out what happened
        and fixing the issue.
    </p>
    <mat-form-field style="width: 100%;">
        <textarea matInput placeholder="Description" [(ngModel)]="details"></textarea>
    </mat-form-field>
    <p *ngIf="error_id">
        Your unique error ID is {{ error_id }}. It will be included with your report.
    </p>
</div>
<div mat-dialog-actions style="justify-content: space-between;">
    <button mat-button (click)="ignore()">
        Ignore
    </button>

    <button mat-raised-button color="primary" (click)="submit()">
        Submit report
    </button>
</div>
    `,
})
export class ErrorReportingDialogComponent {
    action: string;
    error_id: string;
    details: string;

    constructor(
        public dialogRef: MatDialogRef<ErrorReportingDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.action = data['action'];
        this.error_id = data['error_id'];
   }

    ignore() {
        this.dialogRef.close({ submit: false });
    }

    submit() {
        this.dialogRef.close({ submit: true, details: this.details });
    }
}
