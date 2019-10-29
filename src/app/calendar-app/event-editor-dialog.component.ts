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
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { RunboxCalendar } from './runbox-calendar';
import { RunboxCalendarEvent } from './runbox-calendar-event';
import { DeleteConfirmationDialogComponent } from './delete-confirmation-dialog.component';

import * as moment from 'moment';

@Component({
    selector: 'app-calendar-event-editor-dialog',
    templateUrl: 'event-editor-dialog.component.html',
})
export class EventEditorDialogComponent {
    event = RunboxCalendarEvent.newEmpty();
    calendars: RunboxCalendar[];
    calendarFC = new FormControl('', Validators.required);
    event_start: Date;
    event_end: Date;

    recurring_frequency: string;
    recurrence_frequencies = [
        { name: 'No',      val: ''        },
        { name: 'Hourly',  val: 'HOURLY'  },
        { name: 'Daily',   val: 'DAILY'   },
        { name: 'Weekly',  val: 'WEEKLY'  },
        { name: 'Monthly', val: 'MONTHLY' },
        { name: 'Yearly',  val: 'YEARLY'  },
    ];

    export_url: string;

    constructor(
        private dialog: MatDialog,
        public dialogRef: MatDialogRef<EventEditorDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.calendars = data['calendars'];
        this.calendarFC.setValue(this.calendars[0].id);

        if (data['event']) {
            this.event = data['event'];
            this.calendarFC.setValue(this.event.calendar);
            this.export_url = '/rest/v1/calendar/ics/' + this.event.id;

            this.event_start = this.event.dtstart.toDate();
            if (this.event.allDay) {
                // inclusive vs exclusive, see the comment in onSubmitClick()
                this.event_end = this.event.dtend.subtract(1, 'day').toDate();
            } else {
                this.event_end = this.event.dtend.toDate();
            }
        }

        if (data['start']) {
            this.event_start = moment(data['start']).hours(12).minutes(0).seconds(0).toDate();
            this.event_end   = moment(data['start']).hours(14).minutes(0).seconds(0).toDate();
        }

        this.recurring_frequency = this.event.recurringFrequency;
    }

    onDeleteClick(): void {
        const dialogData = { name: 'event' };
        if (this.event.rrule) {
            dialogData['details'] = 'Note that this is a reccuring event – deleting it will delete ALL instances';
        }
        const confirmRef = this.dialog.open(DeleteConfirmationDialogComponent, { data: dialogData });
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

        this.event.dtstart = moment(this.event_start).seconds(0).milliseconds(0);
        this.event.dtend   = moment(this.event_end).seconds(0).milliseconds(0);

        // For a user it makes sense that a 2-day-long event starts on 1st and ends on 2nd.
        // For iCalendar however, that's a 1-day event since end dates are non-inclusive.
        //
        // Since the user is the sane one here, let's just make all allDay events one day
        // longer behind the scenes (that's how nextcloud does it too, for example).
        if (this.event.allDay) {
            // make sure we're going through the setter
            this.event.dtend = this.event.dtend.add(1, 'day');
        }

        this.event.recurringFrequency = this.recurring_frequency;

        this.dialogRef.close(this.event);
    }
}
