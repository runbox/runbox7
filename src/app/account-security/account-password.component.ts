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
import { Component } from '@angular/core';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { RMM } from '../rmm';
import { share, timeout } from 'rxjs/operators';

@Component({
    selector: 'app-account-password',
    styleUrls: ['account.security.component.scss'],
    templateUrl: 'account-password.component.html',
})
export class AccountPasswordComponent {
    old_password: string;
    new_password: string;
    confirm_password: string;
    error: string;
    time_out;
    time_out_duration = 650;

    constructor(public snackBar: MatSnackBar, public rmm: RMM) {
        this.rmm.me.load();
    }

    check_password(old_password = this.old_password, new_password = this.new_password, confirm_password = this.confirm_password) {
        clearTimeout(this.time_out);

        // Used timeout to prevent (ngModelChange) from validating the form on every stroke
        // right away. Jumping between errors on every keyup could be annoying to the user.
        // Could use (change) or (blur) in the form but they work only when you lose focus of
        // the field. This is not ideal, because usually you wouldn't lose focus of the last
        // field before submiting.

        this.time_out = setTimeout(() => {
            if (!old_password || !new_password || !confirm_password) {
                this.error = 'The password fields cannot be empty';
                return;
            }

            if (new_password !== confirm_password) {
                this.error = 'The entered passwords do not match';
                return;
            }

            if (new_password.length < 8 || new_password.length > 64) {
                this.error = 'Your new password must be between 8 and 64 characters long';
                return;
            }

            if (!/[a-z]/i.test(new_password)) {
                this.error = 'Your new password must contain at least 1 alphabetical character';
                return;
            }

            if (!/[0-9]/i.test(new_password)) {
                this.error = 'Your new password must contain at least 1 numeric character';
                return;
            }

            if (!/[#?!@$%^&*-]/i.test(new_password)) {
                this.error = 'Your new password must contain at least 1 special character. Allowed special characters include: # ? ! @ $ % ^ & *';
                return;
            }

            this.error = undefined;
            return true;
        }, this.time_out_duration);
    }

    update_password(old_password = this.old_password, new_password = this.new_password, confirm_password = this.confirm_password) {
        if (this.error) {
            return;

            // Prevents submitting an empty form that doesn't have errors yet
        } else if (!old_password || !new_password || !confirm_password) {
            this.error = 'Fields can not be empty';
            return;
        } else {
            const values = {
                old_password: old_password,
                password: new_password,
                password_confirm: confirm_password,
            };

            const req = this.rmm.ua.http.put('/rest/v1/account/password', values).pipe(timeout(60000), share());
            req.subscribe((reply) => {
                if (reply['status'] === 'success') {
                    this.show_notification('Password updated', 'Dismiss');
                } else if (reply['status'] === 'error') {
                    this.error = reply['field_errors'][Object.keys(reply['field_errors'])[0]];
                    return;
                }
            });
            return req;
        }
    }

    show_notification(message, action) {
        this.snackBar.open(message, action, {
            duration: 2000,
        });
    }
}
