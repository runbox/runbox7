// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2019 Runbox Solutions AS (runbox.com).
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

import { Component, EventEmitter, Output } from '@angular/core';
import { LogoutService } from '../login/logout.service';

@Component({
    selector: 'app-sidenav-menu',
    template: `
<div class="sidenavMainMenu">
    <div id="sidenavLogoContainer">
        <a mat-button id="sidenavLogoButton" (click)="closeMenu.emit()">
            <img src="assets/runbox7.png" id="logoSidenav" alt="Runbox 7" />
        </a>
        <br />
        <div style="display: flex; justify-content: space-around;">
            <button mat-mini-fab routerLink="/">
                <mat-icon>email</mat-icon>
            </button>
            <button mat-mini-fab routerLink="/contacts">
                <mat-icon>people</mat-icon>
            </button>
            <button mat-mini-fab routerLink="/calendar">
                <mat-icon>date_range</mat-icon>
            </button>
            <button mat-mini-fab (click)="logoutservice.logout()">
                <mat-icon>power_settings_new</mat-icon>
            </button>
        </div>
        <br />
    </div>
</div>
    `,
})
export class SidenavMenuComponent {
    @Output() closeMenu = new EventEmitter<void>();

    constructor(
        public logoutservice: LogoutService,
    ) {
    }
}
