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

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { FolderListComponent } from './folderlist.component';
export { FolderListComponent, MoveFolderEvent, RenameFolderEvent, CreateFolderEvent } from './folderlist.component';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTreeModule } from '@angular/material/tree';
import { DialogModule } from '../dialog/dialog.module';

@NgModule({
    imports: [
        CommonModule,
        MatIconModule,
        MatButtonModule,
        MatMenuModule,
        MatListModule,
        MatTreeModule,
        DialogModule,
        DragDropModule,
        MatTooltipModule,
        MatBadgeModule
    ],
    exports: [
        FolderListComponent,
    ],
    declarations: [
        FolderListComponent,
    ]
})
export class FolderModule {
}
