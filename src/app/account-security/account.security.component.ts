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
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { RMM } from '../rmm';

@Component({
    selector: 'app-modal-unlockcode-component',
    template: `
        <div mat-dialog-content>
            <h3> Unlock code required </h3>
            <div>
                <p> The unlock code can be used to disable 2FA if you have problems logging in with your 2FA codes. </p>
                <p>
                    I confirm I have made a copy of the unlock code and will keep it in a safe place. I understand that if I lose the unlock code I
                    may not be able to access my account.
                </p>
                <p style="text-align: center;">
                    Your code:
                    <span style="font-size: 26px; font-weight: bold;">{{ data.parent_ref.rmm.account_security.unlock_code.unlock_code }}</span>
                </p>
                <p>
                    <button class="primaryContentButton" mat-raised-button (click)="close()">Continue</button>
                </p>
                <mat-progress-bar mode="indeterminate" *ngIf="is_creating_unlockcode"></mat-progress-bar>
            </div>
        </div>
    `,
})
export class ModalUnlockcodeComponent {
    is_creating_unlockcode = false;

    constructor(@Inject(MAT_DIALOG_DATA) public data: any, public dialogRef: MatDialogRef<ModalUnlockcodeComponent>, public rmm: RMM) {
        this.is_creating_unlockcode = true;
        this.data.parent_ref.rmm.account_security.unlock_code
            .generate({
                action: 'generate',
                password: this.data.parent_ref.rmm.account_security.user_password,
            })
            .subscribe(() => {
                this.is_creating_unlockcode = false;
                this.data.parent_ref.rmm.account_security.tfa.get();
            });
    }

    close() {
        this.dialogRef.close(this.data);
    }
}

@Component({
    selector: 'app-modal-password-component',
    template: `
        <h1 mat-dialog-title>
            Please enter your account password
        </h1>
        <div mat-dialog-content>
            <form class="">
                <mat-form-field class="">
                    <input
                        matInput
                        placeholder="Account password"
                        name="user_password"
                        type="password"
                        autocomplete="current-password"
                        [(ngModel)]="data.password"
                        cdkFocusInitial
                        (keydown.enter)="check_pass()"
                        (keydown.esc)="close()"
                    />
                </mat-form-field>
                <button class="primaryContentButton" mat-raised-button (click)="check_pass()">Continue</button>
            </form>
            <p style="color: red;" *ngIf="!is_password_correct"> The password is wrong. Please enter the password again. </p>
            <p> For security reasons your account password is required to save Account Security settings. </p>
        </div>
    `,
})
export class ModalPasswordComponent {
    is_password_correct = true;

    constructor(@Inject(MAT_DIALOG_DATA) public data: any, public dialogRef: MatDialogRef<ModalPasswordComponent>, public rmm: RMM) {}

    check_pass() {
        this.rmm.account_security.check_password(this.data['password']).subscribe((reply) => {
            if (reply['status'] === 'error' && reply['error'] === 'password invalid') {
                this.is_password_correct = false;
            } else {
                this.dialogRef.close(this.data);
            }
        });
    }

    close() {
        this.dialogRef.close(this.data);
    }
}
