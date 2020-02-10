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
import { RouterModule } from '@angular/router';
import { MatInputModule } from '@angular/material';
import { MatDialogModule } from '@angular/material';

import {
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatListModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSidenavModule,
    MatToolbarModule,
    MatTooltipModule,
    MatMenuModule,
    MatGridListModule,
    MatCheckboxModule,
    MatTableModule
} from '@angular/material';

import { ProfilesComponent } from './profiles.component';
import { ProfilesListerComponent } from './profiles.lister';
import { AliasesListerComponent } from '../aliases/aliases.lister';
import { ProfilesEditorModalComponent } from './profiles.editor.modal';
import { AliasesEditorModalComponent } from '../aliases/aliases.editor.modal';

@NgModule({
    declarations: [
      AliasesListerComponent,
      ProfilesComponent,
      ProfilesListerComponent,
      ProfilesEditorModalComponent,
      AliasesEditorModalComponent,
    ],
    imports: [
    CommonModule,
    MatDialogModule,
    MatGridListModule,
    MatCheckboxModule,
    FormsModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatMenuModule,
    MatIconModule,
    MatListModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSidenavModule,
    MatToolbarModule,
    MatTooltipModule,
    MatTableModule,
    MenuModule,
    RouterModule.forChild([ { path: '', component: ProfilesComponent } ]),
    ],
    entryComponents: [
      ProfilesEditorModalComponent,
      AliasesEditorModalComponent,
    ],
    providers: [
    ],
    bootstrap: []
})
export class ProfilesModule { }


