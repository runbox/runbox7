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
    selector: 'app-last-logins',
    styleUrls: ['account.security.component.scss'],
    templateUrl: 'last-logins.component.html',
})
export class LastLoginsComponent implements OnInit  {
    panelOpenState = false;
    @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;
    @Output() Close: EventEmitter<string> = new EventEmitter();
    dialog_ref: any;
    acl_service = '';
    acl_status = '';
    acl_period = '1h';
    acl_filter_ips = '';
    acl_ip = '';
    acl_overwrite_subaccount_rules = '0';
    is_acl_clear_enabled = false;
    acl_manage_ip_rule = 'deny';
    acl_manage_ip_range = '';
    acl_manage_ip_label = '';
    is_busy_list_logins = false;
    modal_password_ref;

    constructor(public snackBar: MatSnackBar, public dialog: MatDialog, public mobileQuery: MobileQueryService, public rmm: RMM) {
        this.rmm.me.load();
    }

    ngOnInit() {
        this.rmm.account_security.device.list();
        this.rmm.account_security.acl.logins_list({});
        this.rmm.account_security.acl.blocked_list();
        this.rmm.account_security.acl.accounts_affected();
        this.rmm.account_security.acl.list({});

        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
        }
    }

    acl_clear() {
        this.acl_ip = '';
    }

    acl_update() {
        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
            return;
        }
        this.is_busy_list_logins = true;
        const query = {};
        query['period'] = this.acl_period;
        query['service'] = this.acl_service;
        query['status'] = this.acl_status;
        if (this.acl_filter_ips) {
            query['ips_filter'] = this.acl_filter_ips.split(',');
        }
        this.rmm.account_security.acl.logins_list(query).subscribe((res) => {
            if (res.status === 'error') {
                this.show_error(res.error || res.errors.join(''), 'Dismiss');
            }
            this.is_busy_list_logins = false;
        });
    }

    acl_save() {
        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
            return;
        }
        this.rmm.account_security.acl
            .update_sub_account({
                is_overwrite_subaccount_ip_rules: this.rmm.account_security.tfa.settings.is_overwrite_subaccount_ip_rules,
                password: this.rmm.account_security.user_password,
            })
            .subscribe((res) => {
                if (res.status === 'success') {
                    this.rmm.account_security.acl.accounts_affected();
                } else {
                    if (res.status === 'error') {
                        this.show_error(res.error || res.errors.join(''), 'Dismiss');
                    }
                }
            });
    }

    acl_remove_rule(result) {
        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
            return;
        }
        this.rmm.account_security.acl
            .remove_rule({
                id: result.id,
                password: this.rmm.account_security.user_password,
            })
            .subscribe((res) => {
                if (res.status === 'error') {
                    this.show_error(res.error || res.errors.join(''), 'Dismiss');
                }
                this.rmm.account_security.acl.list({});
            });
    }

    acl_create_rule() {
        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
            return;
        }
        this.rmm.account_security.acl
            .create_rule({
                password: this.rmm.account_security.user_password,
                ip: this.acl_manage_ip_range,
                label: this.acl_manage_ip_label,
                rule: this.acl_manage_ip_rule,
            })
            .subscribe((res) => {
                if (res.status === 'success') {
                    this.rmm.account_security.acl.list({});
                }
            });
    }

    acl_ip_changed() {
        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
            return;
        }
        if (this.acl_ip && this.acl_ip.length) {
            this.is_acl_clear_enabled = true;
        } else {
            this.is_acl_clear_enabled = false;
        }
    }

    ip_unblock(result) {
        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
            return;
        }
        this.rmm.account_security.acl
            .unblock({
                ip: result.ip,
                password: this.rmm.account_security.user_password,
            })
            .subscribe((res) => {
                if (res.status === 'error') {
                    this.show_error(res.error || res.errors.join(''), 'Dismiss');
                }
            });
    }

    ip_always_block(result) {
        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
            return;
        }
        this.rmm.account_security.acl
            .update({
                ip: result.ip,
                label: 'Always Block',
                rule: 'deny',
                password: this.rmm.account_security.user_password,
            })
            .subscribe((res) => {
                if (res.status === 'error') {
                    this.show_error(res.error || res.errors.join(''), 'Dismiss');
                }
                this.rmm.account_security.acl.logins_list({});
                this.rmm.account_security.acl.blocked_list();
            });
    }

    ip_never_block(result) {
        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
            return;
        }
        this.rmm.account_security.acl
            .update({
                ip: result.ip,
                rule: 'allow',
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
