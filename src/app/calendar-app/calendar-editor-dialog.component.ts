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

import { Component, Inject } from '@angular/core';
import { MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';

import { RunboxCalendar } from './runbox-calendar';
import { ColorSelectorDialogComponent } from './color-selector-dialog.component';
import { DeleteConfirmationDialogComponent } from './delete-confirmation-dialog.component';

@Component({
    selector: 'app-calendar-editor-dialog-component',
    templateUrl: 'calendar-editor-dialog.component.html',
})
export class CalendarEditorDialogComponent {
    calendar: RunboxCalendar = new RunboxCalendar({ id: '' });
    name = 'New calendar';

    constructor(
        private dialog: MatDialog,
        public dialogRef: MatDialogRef<CalendarEditorDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        if (data) {
            console.log('Opening calendar:', data);
            this.calendar = data;
            this.name = data.toString();
        }
    }

    openColorSelector(): void {
        const colorDialogRef = this.dialog.open(ColorSelectorDialogComponent, { data: [this.calendar.color] });
        colorDialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.calendar.color = result;
            }
        });
    }

    onDeleteClick(): void {
        const confirmRef = this.dialog.open(DeleteConfirmationDialogComponent, { data: { name: 'calendar' } });
        confirmRef.afterClosed().subscribe(result => {
            if (result) {
                this.dialogRef.close('DELETE');
            }
        });
    }

    onCancelClick(): void {
        this.dialogRef.close();
    }

    onSubmitClick(): void {
        this.dialogRef.close(this.calendar);
    }
}
