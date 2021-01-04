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
import { Component, Input, Output, EventEmitter } from '@angular/core';

import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProfilesEditorModalComponent } from './profiles.editor.modal';
import { RMM } from '../rmm';

@Component({
    selector: 'app-profiles-lister',
    styleUrls: ['profiles.lister.scss'],
    templateUrl: 'profiles.lister.html',
})
export class ProfilesListerComponent {
    @Input() values: any[];
    @Output() ev_reload = new EventEmitter<string>();

    private dialog_ref: any;
    constructor(
        public dialog: MatDialog,
        public rmm: RMM,
        public snackBar: MatSnackBar
    ) {
        this.rmm.me.load();
    }

    edit(item): void {
        item = JSON.parse(JSON.stringify(item));
        this.dialog_ref = this.dialog.open(ProfilesEditorModalComponent, {
            width: '600px',
            data: item,
        });

        this.dialog_ref.componentInstance.is_update = true;
        this.dialog_ref.componentInstance.css_class = 'update';
        this.dialog_ref.afterClosed().subscribe((result) => {
            this.ev_reload.emit('updated');
            item = result;
        });
    }

    delete(i, item) {
        this.dialog_ref = this.dialog.open(ProfilesEditorModalComponent, {
            width: '600px',
            data: item,
        });
        this.dialog_ref.componentInstance.is_delete = true;
        this.dialog_ref.afterClosed().subscribe((result) => {
            if (this.dialog_ref.componentInstance.has_deleted) {
                this.ev_reload.emit('deleted');
            }
        });
    }

    show_error(message, action) {
        this.snackBar.open(message, action, {
            duration: 2000,
        });
    }
}
