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

export class SimpleInputDialogParams {
    constructor(
        public title: string,
        public message: string,
        public placeholder: string,
        public isValidInput: (value: string) => boolean = (value) => true) {

    }
}

@Component({
    template: `
        <h1 mat-dialog-title>
            {{data.title}}
        </h1>
        <mat-dialog-content >
            <div [innerHtml]="trustedHtml">
            </div>
            <mat-form-field style="margin-top: 20px;">
                <input matInput [placeholder]="data.placeholder" (keyup)="sumbitOnEnter($event)" [(ngModel)]="inputText" />
            </mat-form-field>
        </mat-dialog-content>

        <mat-dialog-actions style="display: flex">
            <p style="flex-grow: 1"></p>
            <button mat-icon-button mat-dialog-close id="cancelButton"><mat-icon svgIcon="cancel"></mat-icon></button>
            <button mat-icon-button mat-dialog-close id="doneButton" (click)="yes()"
                [disabled]="!data.isValidInput(inputText)"><mat-icon svgIcon="check"></mat-icon></button>
        </mat-dialog-actions>`
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class SimpleInputDialog {
    trustedHtml: SafeHtml;

    inputText: string;

    constructor(
        @Inject(
            MAT_DIALOG_DATA) public data: SimpleInputDialogParams,
        public dialogRef: MatDialogRef<SimpleInputDialog>,
        sanitizer: DomSanitizer) {
        this.trustedHtml = sanitizer.bypassSecurityTrustHtml(data.message);
    }

    yes() {
        this.dialogRef.close(this.inputText);
    }

    sumbitOnEnter(e) {
        if (e.keyCode === 13 && this.data.isValidInput(this.inputText)) {
            this.yes();
        }
    }
}
