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
import { Component, Output, EventEmitter, ViewChild } from '@angular/core';
import { MatLegacyPaginator as MatPaginator } from '@angular/material/legacy-paginator';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MobileQueryService } from '../mobile-query.service';
import { RMM } from '../rmm';

@Component({
    selector: 'app-sessions',
    styleUrls: ['account.security.component.scss'],
    templateUrl: 'sessions.component.html',
})
export class SessionsComponent {
    panelOpenState = false;
    @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;
    @Output() Close: EventEmitter<string> = new EventEmitter();
    dialog_ref: any;

    constructor(public snackBar: MatSnackBar, public dialog: MatDialog, public mobileQuery: MobileQueryService, public rmm: RMM) {
        this.rmm.me.load();
    }

    ngOnInit() {
        this.rmm.account_security.session.list();
    }
}
