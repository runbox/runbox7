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
import { RRule } from 'rrule';

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

    recurring_frequency: number;
    recurrence_frequencies = [
        { name: 'No',      val: -1            },
        { name: 'Hourly',  val: RRule.HOURLY  },
        { name: 'Daily',   val: RRule.DAILY   },
        { name: 'Weekly',  val: RRule.WEEKLY  },
        { name: 'Monthly', val: RRule.MONTHLY },
        { name: 'Yearly',  val: RRule.YEARLY  },
    ];

    export_url: string;

    constructor(
        private dialog: MatDialog,
        public dialogRef: MatDialogRef<EventEditorDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        if (data['event']) {
            this.event = data['event'];
            this.calendarFC.setValue(this.event.calendar);
            this.export_url = '/rest/v1/calendar/ics/' + this.event.id;
        }
        this.event.refreshDates();
        this.calendars = data['calendars'];
        this.recurring_frequency = this.event.rrule ? this.event.rrule.options.freq : -1;
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
        this.event.dtstart = moment(this.event.start).seconds(0).milliseconds(0);
        this.event.dtend = moment(this.event.end).seconds(0).milliseconds(0);

        // For a user it makes sense that a 2-day-long event starts on 1st and ends on 2nd.
        // For iCalendar however, that's a 1-day event since end dates are non-inclusive.
        //
        // Since the user is the sane one here, let's just make all allDay events one day
        // longer behind the scenes (that's how nextcloud does it too, for example).
        if (this.event.allDay) {
            this.event.dtend.add(1, 'day');
        }

        this.event.refreshDates();
        this.event.setRecurringFrequency(this.recurring_frequency);

        this.dialogRef.close(this.event);
    }
}
