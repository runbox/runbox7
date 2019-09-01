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

import { NgModule, ApplicationRef, ComponentFactoryResolver, Injector, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule, MatButtonModule,
    MatIconModule,
    MatTooltipModule, MatDialogModule, MatMenuModule,
    MatRadioModule, MatCheckboxModule, MatCardModule, MatGridListModule,
    MatDividerModule, MatExpansionModule } from '@angular/material';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { SingleMailViewerComponent, ShowHTMLDialogComponent } from './singlemailviewer.component';
import { ResizerModule } from '../directives/resizer.module';
import { ContactCardComponent } from './contactcard.component';
export { SingleMailViewerComponent } from './singlemailviewer.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        HttpModule,
        MatCheckboxModule,
        MatButtonModule,
        MatRadioModule,
        MatMenuModule,
        MatCardModule,
        MatDialogModule,
        ResizerModule,
        MatIconModule,
        MatGridListModule,
        MatToolbarModule,
        MatTooltipModule,
        MatDividerModule,
        MatExpansionModule
    ],
    exports: [
        SingleMailViewerComponent
    ],
    declarations: [
        ContactCardComponent,
        SingleMailViewerComponent,
        ShowHTMLDialogComponent
    ],
    entryComponents: [
        ShowHTMLDialogComponent
    ]
})
export class MailViewerModule {

}
