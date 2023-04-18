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
import { ModalPasswordComponent } from './account.security.component';

@Component({
    selector: 'app-app-passwords',
    styleUrls: ['account.security.component.scss'],
    templateUrl: 'app-passwords.component.html',
})
export class AppPasswordsComponent implements OnInit {
    panelOpenState = false;
    @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;
    @Output() Close: EventEmitter<string> = new EventEmitter();
    app_pass_columns_desktop = ['name', 'status', 'password', 'action'];
    app_pass_columns_mobile = ['name', 'status'];
    app_pass_name: string;
    is_btn_app_pass_new_disabled = false;
    modal_password_ref;

    constructor(public snackBar: MatSnackBar, public dialog: MatDialog, public mobileQuery: MobileQueryService, public rmm: RMM) {
        this.rmm.me.load();
    }

    ngOnInit() {
        this.rmm.account_security.tfa.get();
        this.rmm.account_security.app_pass.list();

        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
        }
    }

    app_pass_create() {
        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
            return;
        }
        this.rmm.account_security.app_pass
            .create({
                name: this.app_pass_name,
                password: this.rmm.account_security.user_password,
            })
            .subscribe((res) => {
                if (res.status === 'error') {
                    this.show_error(res.error || res.errors.join(''), 'Dismiss');
                }
            });
    }

    app_pass_name_changed() {
        if (this.app_pass_name) {
            this.is_btn_app_pass_new_disabled = false;
        } else {
            this.is_btn_app_pass_new_disabled = true;
        }
    }

    app_pass_delete(result) {
        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
            return;
        }
        this.rmm.account_security.app_pass
            .update({
                action: 'delete',
                id: result.id,
                password: this.rmm.account_security.user_password,
            })
            .subscribe((res) => {
                if (res.status === 'error') {
                    this.show_error(res.error || res.errors.join(''), 'Dismiss');
                }
            });
    }

    app_pass_toggle_main_switch() {
        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
            return;
        }
        this.rmm.account_security.app_pass
            .update({
                is_enabled: this.rmm.account_security.tfa.settings.is_app_pass_enabled ? 1 : 0,
                action: 'update_status',
                password: this.rmm.account_security.user_password,
            })
            .subscribe((res) => {
                if (res.status === 'error') {
                    this.show_error(res.error || res.errors.join(''), 'Dismiss');
                }
            });
    }

    app_pass_toggle(result) {
        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
            return;
        }
        this.rmm.account_security.app_pass
            .update({
                is_enabled: result.is_enabled,
                action: 'update_pass_status',
                id: result.id,
                password: this.rmm.account_security.user_password,
            })
            .subscribe((res) => {
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
