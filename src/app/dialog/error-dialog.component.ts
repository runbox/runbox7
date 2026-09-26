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
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
    selector: 'app-error-dialog-component',
    template: `
<h1 mat-dialog-title>
    Error
</h1>

<div mat-dialog-content>
    <p> {{ message }} </p>
</div>

<div mat-dialog-actions style="justify-content: flex-begin;">
    <button mat-button (click)="dialogRef.close()">
        Ok
    </button>
</div>
`,
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class ErrorDialog {
    message: string;

    constructor(
        public dialogRef: MatDialogRef<ErrorDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.message = this.data['message'];
    }
}
