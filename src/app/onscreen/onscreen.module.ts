// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2020 Runbox Solutions AS (runbox.com).
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

import { CommonModule } from '@angular/common';
import { NgModule, ErrorHandler } from '@angular/core';
import { MenuModule } from '../menu/menu.module';
import { RouterModule } from '@angular/router';
import { SentryErrorHandler } from '../sentry-error-handler';

import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';

import { OnscreenComponent } from './onscreen.component';

@NgModule({
    declarations: [
        OnscreenComponent,
    ],
    imports: [
        CommonModule,
        FormsModule,
        MenuModule,
        MatButtonModule,
        MatIconModule,
        MatInputModule,
        MatListModule,
        MatSidenavModule,
        MatToolbarModule,
        RouterModule.forChild([
            {
                path: '',
                component: OnscreenComponent,
            },
            {
                path: ':meetingCode',
                component: OnscreenComponent,
            }
        ]),
    ],
    providers: [
        { provide: ErrorHandler, useClass: SentryErrorHandler },
    ],
    bootstrap: []
})

export class OnscreenModule { }
