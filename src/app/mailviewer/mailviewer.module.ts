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
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatRadioModule } from '@angular/material/radio';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { SingleMailViewerComponent } from './singlemailviewer.component';
import { ShowHTMLDialogComponent } from '../dialog/htmlconfirm.dialog';
// import { ShowImagesDialogComponent } from '../dialog/imagesconfirm.dialog';
import { ResizerModule } from '../directives/resizer.module';
import { AvatarBarComponent } from './avatar-bar.component';
import { ContactCardComponent } from './contactcard.component';
export { SingleMailViewerComponent } from './singlemailviewer.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        MatCheckboxModule,
        MatButtonModule,
        MatRadioModule,
        MatMenuModule,
        MatCardModule,
        MatDialogModule,
        ResizerModule,
        MatIconModule,
        MatGridListModule,
        MatListModule,
        MatToolbarModule,
        MatTooltipModule,
        MatDividerModule,
        MatExpansionModule
    ],
    exports: [
        SingleMailViewerComponent
    ],
    declarations: [
        AvatarBarComponent,
        ContactCardComponent,
        SingleMailViewerComponent,
        ShowHTMLDialogComponent
    ]
})
export class MailViewerModule {

}
