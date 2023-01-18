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

import { Component, Inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export class InfoParams {
    constructor(
        public title: string,
        public message: string) {

    }
}

@Component({
    template: `
        <h1 mat-dialog-title>
            {{data.title}}
        </h1>
        <mat-dialog-content [innerHtml]="trustedHtml">
        </mat-dialog-content>
        <mat-dialog-actions style="display: flex">
            <p style="flex-grow: 1"></p>
            <button mat-icon-button mat-dialog-close><mat-icon svgIcon="check"></mat-icon></button>
        </mat-dialog-actions>`
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class InfoDialog {
    trustedHtml: SafeHtml;

    constructor(
        @Inject(
            MAT_DIALOG_DATA) public data: InfoParams,
        public dialogRef: MatDialogRef<InfoDialog>,
        sanitizer: DomSanitizer) {
        this.trustedHtml = sanitizer.bypassSecurityTrustHtml(data.message);
    }

    yes() {
        this.dialogRef.close(true);
    }
}
