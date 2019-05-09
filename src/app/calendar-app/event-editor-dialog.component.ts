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
import { FormControl, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

import { RunboxCalendar } from './runbox-calendar';
import { RunboxCalendarEvent } from './runbox-calendar-event';
import { DeleteConfirmationDialogComponent } from './delete-confirmation-dialog.component';

import * as moment from 'moment';

@Component({
    selector: 'app-calendar-event-editor-dialog',
    templateUrl: 'event-editor-dialog.component.html',
})
export class EventEditorDialogComponent {
    event = new RunboxCalendarEvent({
        title: '',
        dtstart: moment(),
        dtend: moment(),
        allDay: false,
    });
    calendars: RunboxCalendar[];
    calendarFC = new FormControl('', Validators.required);

    constructor(
        private dialog: MatDialog,
        public dialogRef: MatDialogRef<EventEditorDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        if (data['event']) {
            this.event = data['event'];
            this.calendarFC.setValue(this.event.calendar);
        }
        this.event.refreshDates();
        this.calendars = data['calendars'];
    }

    onDeleteClick(): void {
        const confirmRef = this.dialog.open(DeleteConfirmationDialogComponent, { data: 'event' });
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
        if (this.calendarFC.invalid) {
            // an error notification doesn't pop up by itself
            // if the user never clicked the control before,
            // so let's help it a little
            this.calendarFC.markAsTouched();
            return;
        } else {
            this.event.calendar = this.calendarFC.value;
        }
        this.event.dtstart = moment(this.event.start);
        this.event.dtend = moment(this.event.end);
        this.dialogRef.close(this.event);
    }
}
