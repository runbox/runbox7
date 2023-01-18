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
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuModule } from '../menu/menu.module';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule } from '@angular/material/dialog';
import { QRCodeModule } from 'angular2-qrcode';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
    ModalPasswordComponent,
    ModalUnlockcodeComponent,
} from './account.security.component';
import { RunboxComponentModule } from '../runbox-components/runbox-component.module';
import { TwoFactorAuthenticationComponent } from './two-factor-authentication.component';
import { ManageServicesComponent } from './manage-services.component';
import { AppPasswordsComponent } from './app-passwords.component';
import { LastLoginsComponent } from './last-logins.component';
import { SessionsComponent } from './sessions.component';
import { AccountPasswordComponent } from './account-password.component';

@NgModule({
    declarations: [
        ModalUnlockcodeComponent,
        ModalPasswordComponent,
        AccountPasswordComponent,
        TwoFactorAuthenticationComponent,
        ManageServicesComponent,
        AppPasswordsComponent,
        LastLoginsComponent,
        SessionsComponent,
    ],
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatCardModule,
        MatCheckboxModule,
        MatChipsModule,
        MatGridListModule,
        MatIconModule,
        MatInputModule,
        MatDialogModule,
        MatListModule,
        MatMenuModule,
        MatProgressBarModule,
        MatProgressSpinnerModule,
        MatSelectModule,
        MatSidenavModule,
        MatSlideToggleModule,
        MatTableModule,
        MatTabsModule,
        MatToolbarModule,
        MatTooltipModule,
        MenuModule,
        QRCodeModule,
        RunboxComponentModule,
    ],
    providers: [],
    bootstrap: []
})
export class AccountSecurityModule { }
