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
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MenuModule } from '../menu/menu.module';
import { RunboxCommonModule } from '../common/common.module';
import { RouterModule } from '@angular/router';

import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatListModule } from '@angular/material/list';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ContactsAppComponent } from './contacts-app.component';
import { ContactButtonComponent } from './contact-button.component';
import { ContactDetailsComponent } from './contact-details/contact-details.component';
import { ContactListComponent } from './contact-list.component';
import { ContactsSettingsComponent } from './contacts-settings.component';
import { ContactsWelcomeComponent } from './contacts-welcome.component';
import { FormArrayEditorComponent } from './contact-details/formarray-editor.component';
import { MultiValueEditorComponent } from './contact-details/multivalue-editor.component';
import { ContactPickerDialogComponent } from './contact-picker-dialog.component';
import { GroupPickerDialogComponent } from './group-picker-dialog-component';
import { VcfImportDialogComponent } from './vcf-import-dialog.component';

@NgModule({
    declarations: [
        ContactsAppComponent,
        ContactButtonComponent,
        ContactDetailsComponent,
        ContactListComponent,
        ContactsSettingsComponent,
        ContactsWelcomeComponent,
        ContactPickerDialogComponent,
        FormArrayEditorComponent,
        GroupPickerDialogComponent,
        MultiValueEditorComponent,
        VcfImportDialogComponent,
    ],
    imports: [
        CommonModule,
        FormsModule,
        MatBadgeModule,
        MatButtonModule,
        MatCheckboxModule,
        MatDialogModule,
        MatExpansionModule,
        MatIconModule,
        MatInputModule,
        MatListModule,
        MatMenuModule,
        MatRadioModule,
        MatSelectModule,
        MatSidenavModule,
        MatToolbarModule,
        MatTooltipModule,
        MenuModule,
        RunboxCommonModule,
        ReactiveFormsModule,
        RouterModule.forChild([
            {
                path: '',
                component: ContactsAppComponent,
                children: [
                    {
                        path: '',
                        component: ContactsWelcomeComponent,
                    },
                    {
                        path: 'settings',
                        component: ContactsSettingsComponent,
                    },
                    {
                        path: ':id',
                        component: ContactDetailsComponent,
                    }
                ]
            }
        ])
    ],
    providers: [],
    bootstrap: []
})
export class ContactsAppModule { }
