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
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

import { CalendarSettings } from './calendar-settings';
import { RunboxCalendar } from './runbox-calendar';
import { RunboxCalendarEvent } from './runbox-calendar-event';
import { ColorSelectorDialogComponent } from './color-selector-dialog.component';
import { DeleteConfirmationDialogComponent } from './delete-confirmation-dialog.component';

@Component({
    selector: 'app-calendar-editor-dialog-component',
    template: `
<h1 mat-dialog-title>Settings</h1>
<div mat-dialog-content>
    <p>
        <mat-checkbox [(ngModel)]="settings.weekStartsOnSunday">
            Week starts on sunday
        </mat-checkbox>
    </p>
</div>

<div mat-dialog-actions style="justify-content: flex-end;">
    <button mat-button (click)="dialogRef.close()">
        Close
    </button>
</div>
    `,
})
export class CalendarSettingsDialogComponent {
    settings: CalendarSettings;

    constructor(
        private dialog: MatDialog,
        public dialogRef: MatDialogRef<CalendarSettingsDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: CalendarSettings
    ) {
        this.settings = data;
    }
}
