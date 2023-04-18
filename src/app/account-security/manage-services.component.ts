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
    selector: 'app-manage-services',
    styleUrls: ['account.security.component.scss'],
    templateUrl: 'manage-services.component.html',
})
export class ManageServicesComponent implements OnInit {
    panelOpenState = false;
    @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;
    @Output() Close: EventEmitter<string> = new EventEmitter();
    dialog_ref: any;
    service_rows: any[];
    service_columns_desktop = ['name', 'status', 'description'];
    service_columns_mobile = ['name', 'status'];
    trusted_browser_columns_desktop = ['name', 'status', 'created', 'action'];
    trusted_browser_columns_mobile = ['name', 'status'];
    modal_password_ref;

    constructor(public snackBar: MatSnackBar, public dialog: MatDialog, public mobileQuery: MobileQueryService, public rmm: RMM) {
        this.rmm.me.load();

        this.service_rows = this.rmm.account_security.service.services_translation_ordered.filter((s: any) => !s.hide);
    }

    ngOnInit() {
        this.list_services();

        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
        }
    }

    list_services() {
        this.rmm.account_security.service.list().subscribe((results) => {});
    }

    service_toggle(result) {
        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
            return;
        }
        if (result.id) {
            this.rmm.account_security.service
                .update({
                    services: [
                        {
                            id: result.id,
                            is_enabled: result.is_enabled,
                            service: result.service,
                        },
                    ],
                    password: this.rmm.account_security.user_password,
                })
                .subscribe((res) => {
                    this.rmm.account_security.service.list();
                    if (res.status === 'error') {
                        this.show_error(res.error || res.errors.join(''), 'Dismiss');
                    }
                });
        } else {
            this.rmm.account_security.service
                .create({
                    services: [
                        {
                            is_enabled: result.is_enabled,
                            service: result.service,
                        },
                    ],
                    password: this.rmm.account_security.user_password,
                })
                .subscribe((res) => {
                    this.rmm.account_security.service.list();
                    if (res.status === 'error') {
                        this.show_error(res.error || res.errors.join(''), 'Dismiss');
                    }
                });
        }
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
