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
import { Component, Output, EventEmitter, ViewChild, OnInit } from '@angular/core';
import { MatLegacyPaginator as MatPaginator } from '@angular/material/legacy-paginator';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MobileQueryService } from '../mobile-query.service';
import { RMM } from '../rmm';
import { timeout, share } from 'rxjs/operators';
import { ModalUnlockcodeComponent, ModalPasswordComponent } from './account.security.component';

@Component({
    selector: 'app-two-factor-authentication',
    styleUrls: ['account.security.component.scss'],
    templateUrl: 'two-factor-authentication.component.html',
})
export class TwoFactorAuthenticationComponent implements OnInit {
    panelOpenState = false;
    @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;
    @Output() Close: EventEmitter<string> = new EventEmitter();
    dialog_ref: any;
    totp_test_code: any;
    is_btn_totp_check_disabled = true;
    is_btn_trust_browser_disabled = true;
    trusted_browser_name: string;
    trusted_browser_columns_desktop = ['name', 'status', 'created', 'action'];
    trusted_browser_columns_mobile = ['name', 'status'];
    is_busy_otp_update = false;
    is_busy_unlock_code_update = false;
    modal_password_ref;

    constructor(public snackBar: MatSnackBar, public dialog: MatDialog, public mobileQuery: MobileQueryService, public rmm: RMM) {
        this.rmm.me.load();
    }

    ngOnInit() {
        this.rmm.account_security.tfa.get();
        this.rmm.account_security.tfa.otp_list();
        this.rmm.account_security.device.list();
        this.rmm.account_security.unlock_code.get();

        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
        }
    }

    totp_generate_new_key() {
        // creates a new key
        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
            return;
        }
        this.rmm.account_security.tfa.totp_regenerate({});
    }

    otp_generate() {
        this.is_busy_otp_update = true;
        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
            return;
        }
        this.rmm.account_security.tfa
            .otp_update({
                action: 'regenerate',
                password: this.rmm.account_security.user_password,
            })
            .subscribe((res) => {
                this.is_busy_otp_update = false;
                if (res.status === 'error') {
                    this.show_error(res.error || res.errors.join(''), 'Dismiss');
                }
                this.rmm.account_security.tfa.get();
                this.rmm.account_security.tfa.otp_list();
            });
    }

    toggle_2fa() {
        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
            return;
        }
        if (!this.rmm.account_security.unlock_code.unlock_code) {
            this.show_dialog_unlockcode();
            return;
        }
        if (
            this.rmm.account_security.tfa.settings.is_2fa_enabled &&
            !this.rmm.account_security.tfa.settings.is_device_2fa_enabled &&
            !this.rmm.account_security.tfa.settings.is_otp_enabled
        ) {
            this.show_error('You must enable either TOTP or OTP in order to enable 2FA.', 'Dismiss');
            this.rmm.account_security.tfa.get();
            return;
        }
        const data = {
            action: 'update',
            is_enabled: this.rmm.account_security.tfa.settings.is_2fa_enabled,
            password: this.rmm.account_security.tfa.app.account_security.user_password,
        };
        this.rmm.account_security.tfa.update(data).subscribe(() => {
            this.rmm.account_security.tfa.get();
        });
    }

    toggle_otp() {
        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
            return;
        }
        if (!this.rmm.account_security.unlock_code.unlock_code) {
            this.show_dialog_unlockcode();
            return;
        }
        if (!this.rmm.account_security.tfa.otp || !this.rmm.account_security.tfa.otp['total_available']) {
            this.rmm.account_security.tfa.get();
            this.show_error('You need to generate passwords before you enable this feature.', 'Dismiss');
            return;
        }
        if (!this.rmm.account_security.tfa.settings.is_2fa_enabled) {
            this.rmm.account_security.tfa.settings.is_2fa_enabled = true;
            this.toggle_2fa();
        }
        if (this.rmm.account_security.tfa.settings.is_2fa_enabled && !this.rmm.account_security.tfa.settings.is_device_2fa_enabled) {
            this.rmm.account_security.tfa.settings.is_2fa_enabled = false;
            this.toggle_2fa();
        }
        const data = {
            action: 'update_status',
            is_enabled: this.rmm.account_security.tfa.settings.is_otp_enabled,
            password: this.rmm.account_security.tfa.app.account_security.user_password,
        };
        this.rmm.account_security.tfa.otp_update(data).subscribe(() => {
            this.rmm.account_security.tfa.get();
            this.rmm.account_security.tfa.otp_list();
        });
    }

    toggle_totp_device() {
        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
            return;
        }
        if (!this.rmm.account_security.unlock_code.unlock_code) {
            this.show_dialog_unlockcode();
            return;
        }
        if (!this.rmm.account_security.tfa.settings.secret) {
            this.show_error('You must generate a new TOTP code before you enable this feature.', 'Dismiss');
            this.rmm.account_security.tfa.get();
            return;
        }
        if (!this.rmm.account_security.tfa.settings.is_2fa_enabled) {
            this.rmm.account_security.tfa.settings.is_2fa_enabled = true;
            this.toggle_2fa();
        }
        if (this.rmm.account_security.tfa.settings.is_2fa_enabled && !this.rmm.account_security.tfa.settings.is_device_2fa_enabled) {
            this.rmm.account_security.tfa.settings.is_2fa_enabled = false;
            this.toggle_2fa();
        }
        const data = {
            action: 'update_status',
            is_enabled: this.rmm.account_security.tfa.settings.is_device_2fa_enabled,
            password: this.rmm.account_security.tfa.app.account_security.user_password,
        };
        this.rmm.account_security.tfa.totp_update(data);
    }

    show_dialog_unlockcode() {
        // dialog displays unlock code and asks user to write it down
        const modal = this.dialog.open(ModalUnlockcodeComponent, {
            width: '600px',
            disableClose: true,
            data: {
                parent_ref: this,
            },
        });
        modal
            .afterClosed()
            .pipe(timeout(60000), share())
            .subscribe((result) => {});
    }

    totp_check_code() {
        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
            return;
        }
        this.rmm.account_security.tfa
            .totp_check({
                password: this.rmm.account_security.user_password,
                code: this.totp_test_code,
                secret: this.rmm.account_security.tfa.new_totp_code,
            })
            .subscribe((res) => {
                if (res.status === 'success') {
                    this.show_error('Your code is correct!', 'Dismiss');
                    this.rmm.account_security.tfa.totp_update({
                        password: this.rmm.account_security.user_password,
                        device: 'totp',
                        action: 'update_secret',
                        secret: this.rmm.account_security.tfa.new_totp_code,
                    });
                } else if (res.status === 'fail') {
                    this.show_error('Could not validate code. Verify and try again.', 'Dismiss');
                } else {
                    if (res.status === 'error') {
                        this.show_error(res.error || res.errors.join(''), 'Dismiss');
                    }
                }
            });
    }

    totp_test_code_change() {
        // enable this.is_btn_totp_check_disabled
        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
            return;
        }
        if (this.totp_test_code && this.totp_test_code.length === 6) {
            this.is_btn_totp_check_disabled = false;
        } else {
            this.is_btn_totp_check_disabled = true;
        }
    }

    device_trust_create() {
        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
            return;
        }
        this.rmm.account_security.device
            .update({
                name: this.trusted_browser_name,
                action: 'trust_device',
                password: this.rmm.account_security.user_password,
            })
            .subscribe((res) => {
                if (res.status === 'error') {
                    this.show_error(res.error || res.errors.join(''), 'Dismiss');
                }
            });
    }

    trusted_browser_name_change() {
        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
            return;
        }
        if (this.trusted_browser_name) {
            this.is_btn_trust_browser_disabled = false;
        } else {
            this.is_btn_trust_browser_disabled = true;
        }
    }

    device_toggle(result) {
        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
            return;
        }
        this.rmm.account_security.device
            .update({
                password: this.rmm.account_security.user_password,
                action: 'update_status',
                is_enabled: result.is_trusted ? 1 : 0,
                id: result.id,
            })
            .subscribe((res) => {
                if (res.status === 'error') {
                    this.show_error(res.error || res.errors.join(''), 'Dismiss');
                }
            });
    }

    device_delete(id) {
        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
            return;
        }
        this.rmm.account_security.device
            .update({
                password: this.rmm.account_security.user_password,
                action: 'delete_device',
                id: id,
            })
            .subscribe((res) => {
                if (res.status === 'error') {
                    this.show_error(res.error || res.errors.join(''), 'Dismiss');
                }
            });
    }

    unlock_code_generate() {
        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
            return;
        }
        this.is_busy_unlock_code_update = true;
        this.rmm.account_security.unlock_code
            .generate({
                action: 'generate',
                password: this.rmm.account_security.user_password,
            })
            .subscribe((res) => {
                this.is_busy_unlock_code_update = false;
                if (res.status === 'error') {
                    this.show_error(res.error || res.errors.join(''), 'Dismiss');
                }
            });
    }

    show_modal_password() {
        this.modal_password_ref = this.dialog.open(ModalPasswordComponent, {
            width: '600px',
            disableClose: true,
            data: { password: null },
        });
        this.modal_password_ref.afterClosed().subscribe((result) => {
            if (result && result['password']) {
                this.rmm.account_security.user_password = result['password'];
            }
        });
    }

    show_error(message, action) {
        this.snackBar.open(message, action, {
            duration: 2000,
        });
    }
}
