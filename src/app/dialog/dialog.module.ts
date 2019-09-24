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

import { ApplicationRef, ComponentFactoryResolver, Injector,
    NgModule,
    NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule,
        MatDialogModule,
        MatIconModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatSnackBarModule
     } from '@angular/material';
import { FormsModule } from '@angular/forms';

import { HttpClientModule } from '@angular/common/http';
import { InfoDialog, InfoParams } from './info.dialog';
import { ProgressDialog } from './progress.dialog';
import { SimpleInputDialog } from './simpleinput.dialog';
import { ConfirmDialog } from './confirmdialog.component';
import { ProgressSnackbarComponent } from './progresssnackbar.component';
import { DialogService } from './dialog.service';
export { ConfirmDialog } from './confirmdialog.component';
export { SimpleInputDialog, SimpleInputDialogParams } from './simpleinput.dialog';
export { InfoDialog, InfoParams } from './info.dialog';
export { ProgressDialog } from './progress.dialog';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        HttpClientModule,
        MatInputModule,
        MatDialogModule,
        MatSnackBarModule,
        MatButtonModule,
        MatTooltipModule,
        MatIconModule,
        MatProgressSpinnerModule
    ],
    exports: [
    ],
    declarations: [
        InfoDialog, ProgressDialog, ConfirmDialog,
        SimpleInputDialog, ProgressSnackbarComponent
    ],
    providers: [
        DialogService
    ],
    entryComponents: [InfoDialog, ProgressDialog, SimpleInputDialog, ConfirmDialog, ProgressSnackbarComponent]
})
export class DialogModule {

}
