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
import { UntypedFormControl, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { CalendarSettings } from './calendar-settings';
import { RunboxCalendar } from './runbox-calendar';
import { RunboxCalendarEvent, RecurSaveType } from './runbox-calendar-event';
import { DeleteConfirmationDialogComponent } from './delete-confirmation-dialog.component';

import moment from 'moment';
import ICAL from 'ical.js';

@Component({
    selector: 'app-calendar-event-editor-dialog',
    templateUrl: 'event-editor-dialog.component.html',
})
export class EventEditorDialogComponent {
    event: RunboxCalendarEvent;
    calendars: RunboxCalendar[];
    calendarFC = new UntypedFormControl('', Validators.required);
    event_start: Date;
    event_end: Date;
    event_title: string;
    event_location: string;
    event_description: string;
    event_allDay = false;
    settings: CalendarSettings;

    event_recurs = false;
    event_is_recur_start = false;
    edit_recurrence = true;
    change_save_type = false;
    recurring_frequency: string;
    recur_interval: number;
    recur_by_months: string[] = [];
    recur_by_monthyeardays: string[] = [];
    recur_by_weekdays: string[] = [];
    recur_save_type = RecurSaveType.ALL_OCCURENCES;
    recurrence_frequencies = [
        { name: 'Hour(s)',    val: 'HOURLY'  },
        { name: 'Day(s)',     val: 'DAILY'   },
        { name: 'Week(s)',    val: 'WEEKLY'  },
        { name: 'Month(s)',   val: 'MONTHLY' },
        { name: 'Year(s)',    val: 'YEARLY'  },
    ];
    weekdays = [
        { name: 'Sunday',     val: 'SU',  recurs_on: false  },
        { name: 'Monday',     val: 'MO',  recurs_on: false  },
        { name: 'Tuesday',    val: 'TU',  recurs_on: false  },
        { name: 'Wednesday',  val: 'WE',  recurs_on: false  },
        { name: 'Thursday',   val: 'TH',  recurs_on: false  },
        { name: 'Friday',     val: 'FR',  recurs_on: false  },
        { name: 'Saturday',   val: 'SA',  recurs_on: false  },
    ];
    month_year_days = [];
    year_months = [
        { name: 'the year' ,  val: 'year',  selected: false },
        { name: 'January',    val: '1',     selected: false },
        { name: 'February',   val: '2',     selected: false },
        { name: 'March',      val: '3',     selected: false },
        { name: 'April',      val: '4',     selected: false },
        { name: 'May',        val: '5',     selected: false },
        { name: 'June',       val: '6',     selected: false },
        { name: 'July',       val: '7',     selected: false },
        { name: 'August',     val: '8',     selected: false },
        { name: 'September',  val: '9',     selected: false },
        { name: 'October',    val: '10',    selected: false },
        { name: 'November',   val: '11',    selected: false },
        { name: 'December',   val: '12',    selected: false },
    ];
    save_types = [
        { name: 'All ocurrences',         val: RecurSaveType.ALL_OCCURENCES,  disabled: false },
        { name: 'This event only',        val: RecurSaveType.THIS_ONLY,       disabled: false },
        { name: 'This and future events', val: RecurSaveType.THIS_AND_FUTURE, disabled: false },
    ];

    export_url: string;

    constructor(
        private dialog: MatDialog,
        public dialogRef: MatDialogRef<EventEditorDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.calendars = data['calendars'];
        this.calendarFC.setValue(this.calendars[0].id);

        this.event = data['event'];
        if (!data['is_new']) {
            this.calendarFC.setValue(this.event.calendar);
            // TODO: Abstract url in rmmapi?
            this.export_url = '/rest/v1/calendar/ics/' + this.event.id;
            this.event_title = this.event.title;
            this.event_location = this.event.location;
            this.event_description = this.event.description;
            this.event_allDay = this.event.allDay;

            this.event_start = this.event.start;
            this.event_end = this.event.end;
            this.event_recurs = this.event.recurs;

            // default:
            this.change_save_type = this.event_recurs;
            if (this.event_recurs
                && this.event_start.toString() === this.event.recurStart.toString()) {
                this.event_is_recur_start = true;
            }

            // Already an exception, may not save as "all occurences"
            // or "this and future"?
            if (this.event.isException) {
                this.save_types[0]['disabled'] = true;
                this.save_types[2]['disabled'] = true;
                this.recur_save_type = RecurSaveType.THIS_ONLY;
                this.edit_recurrence = false;
            }
            this.recurring_frequency = this.event.recurringFrequency;
            this.recur_interval = this.event.recurInterval;
            // default, maybe overridden below:
            this.recur_by_months = ['year'];
            // This is a list of objects with 'day' + 'numth' keys
            // numth is only set for monthly recurrences
            // for weekly, just list the day values
            const setDays = this.event.recursByDay;
            const recurs_on_weekdays = [];
            this.weekdays.forEach((day) => {
                const hasDay = setDays.find((entry) => entry['day'] === day.val);
                if (hasDay) {
                    day['recurs_on'] = true;
                    if (hasDay['numth'] > 0) {
                        this.recur_by_monthyeardays.push(hasDay['numth']);
                    }
                    recurs_on_weekdays.push(day.val);
                }
            });
            if (this.recur_by_monthyeardays.length === 0) {
                this.recur_by_monthyeardays = ['0'];
            }
            this.recur_by_weekdays = recurs_on_weekdays;
            // day(s) of the month a monthly recurs:
            if ((this.recurring_frequency === 'MONTHLY' || this.recurring_frequency === 'YEARLY')
                && this.event.recursByMonthDay.length > 0) {
                this.recur_by_monthyeardays = this.event.recursByMonthDay;
                this.recur_by_weekdays = ['day'];
            }
            if (this.recurring_frequency === 'YEARLY'
                && this.event.recursByYearDay.length > 0) {
                this.recur_by_monthyeardays = this.event.recursByYearDay;
                this.recur_by_weekdays = ['day'];
            }
            if (this.recur_by_monthyeardays.length === 0) {
                // neither, set defaults in case its changed to either of these
                this.recur_by_monthyeardays = [this.event_start.getDate().toString()];
            }
            if (this.recur_by_weekdays.length === 0) {
                this.recur_by_weekdays = ['day'];
            }
            // month event occurs if yearly:
            if (this.recurring_frequency === 'YEARLY'
                && this.event.recursByMonth.length > 0) {
                this.recur_by_months = this.event.recursByMonth;
            } else {
                this.recur_by_months = [String(this.event_start.getMonth() + 1)];
            }
        } else {
            if (data['start']) {
                this.event_start = moment(data['start']).hours(12).minutes(0).seconds(0).toDate();
                this.event_end   = moment(data['start']).hours(14).minutes(0).seconds(0).toDate();
            } else {
                const now = moment();
                this.event_start = now.toDate();
                this.event_end   = now.add(1, 'hours').toDate();
            }

            // Default things for "new" events
            // We should probably do these when user clicks the "event repeats" checkbox?
            this.recurring_frequency = 'DAILY';
            this.recur_interval = 1;
            // for fresh events, default to start date chosen
            this.recur_by_monthyeardays = [this.event_start.getDate().toString()];
            this.recur_by_weekdays = ['day'];
            this.recur_by_months = [String(this.event_start.getMonth() + 1)];
            const chosenDay = ICAL.Time.fromJSDate(this.event_start).dayOfWeek();
            this.weekdays[chosenDay - 1].recurs_on = true;
        }

        this.settings = data['settings'];


        // number of max days to display for monthly:
        this.generateMonthYearDays('MONTHLY', this.event_start);
    }

    private generateMonthYearDays(repeat_type: string, when: Date) {
        const m_repeats = [{ name: 'All', val: '0', selected: false }];
        let days_to_generate = 0;
        if (repeat_type === 'MONTHLY') {
            days_to_generate = ICAL.Time.daysInMonth(when.getMonth() + 1);
        } else {
            // YEARLY
            days_to_generate = 366;
        }
        // including 0 for "no number"
        for (let i = 1; i <= days_to_generate; i++) {
            const val = i.toString();
            const th = val.endsWith('1')
                ? 'st'
                : val.endsWith('2')
                ? 'nd'
                : val.endsWith('3')
                ? 'rd'
                : 'th';
            m_repeats.push({ name: val + th, val: val, selected: false });
        }
        this.month_year_days = m_repeats;
    }

    // exception recurrences (different start time or description etc)
    // can't have RRULEs, so once we change the RRULE data, disallow
    // different saving
    public updateInterval(): void {
        this.change_save_type = false;
    }

    public updateFrequency(): void {
        this.change_save_type = false;
    }

    public updateWeekdays(): void {
        this.change_save_type = false;
    }

    // capture Nth field changes
    // could be Nth of month or Nth Xday of month!
    // event: MatSelectChange? (not found!)
    public updateMonthlyNth(event): void {
        // If we're picking a weekday, can only be 1st-5th repeating
        // (no 6ths Mondays in the month!)
        if (this.recur_by_weekdays[0] !== 'day'
            && (event.value.length > 1
                || event.value.find((entry) => parseInt(entry, 10) > 5)) ) {
            this.recur_by_weekdays = ['day'];
        }
        this.change_save_type = false;
    }

    public updateWeekday(event): void {
        // Can't combine "day" and weekday
        // we could "disable" the weekdays when picking day
        // and the day when picking a weekday? Need a ViewChild?
        if (event.value.length > 1
            && event.value.find((entry) => entry === 'day')) {
            console.log("Event editor - can't pick 'day' plus anything else");
            const filtered_values = event.value.filter((entry) => entry !== 'day');
            this.recur_by_weekdays = filtered_values;
        }

        // If we're picking a weekday, can only be 1st-5th repeating
        // (no 6ths Mondays in the month!)
        if (event.value[0] !== 'day'
            && (this.recur_by_monthyeardays.length > 1
                || parseInt(this.recur_by_monthyeardays[0], 10) > 5)) {
            this.recur_by_monthyeardays = ['1'];
        }
        this.change_save_type = false;
    }

    public updateMonths(event): void {
        // month, year, actual month name
        if (event.value.length > 1
            && event.value.find((entry) => entry === 'month')) {
            this.recur_by_months = ['month'];
        }
        if (event.value.length > 1
            && event.value.find((entry) => entry === 'year')) {
            this.recur_by_months = ['year'];
        }
        if (this.recur_by_months.length === 1) {
            if (this.recur_by_months[0] === 'year') {
                // We can pick any/all days of year
                this.generateMonthYearDays('YEARLY', this.event_start);
            } else if (this.recur_by_months[0] === 'month') {
                // based on initial event start month
                this.generateMonthYearDays('MONTHLY', this.event_start);
            } else {
                // Days of chosen month:
                this.generateMonthYearDays('MONTHLY', new Date(this.event_start.getFullYear(), event.value - 1, 1));
            }
        }
        // remove any days previously picked that are no longer in the list:
        const maxValue = this.month_year_days.reduce(
            (current, entry) => parseInt(current['val'], 10) > parseInt(entry['val'], 10) ? current : entry);
        const new_monthyeardays = this.recur_by_monthyeardays.filter((entry) => parseInt(entry, 10) <= parseInt(maxValue['val'], 10));
        this.recur_by_monthyeardays = new_monthyeardays;
        this.change_save_type = false;
    }

    // we assume they don't jump back and forth between startdate+recurrence?
    // NB: ngModelChange has to be before ngModel (in template) to read
    // the old value
    public updateStart(value: Date) {
        // Do this always, in case we fiddle with dates, then
        // set event_recurs:
        if (!this.event_recurs) {
            this.generateMonthYearDays('MONTHLY', value);
            this.recur_by_monthyeardays = [value.getDate().toString()];
            this.recur_by_months = [String(value.getMonth() + 1)];

            // select weekday matching day chosen (1-7 in time.js):
            const chosenDay = ICAL.Time.fromJSDate(value).dayOfWeek();
            this.weekdays.map((entry) => entry.recurs_on = false);
            this.weekdays[chosenDay - 1].recurs_on = true;
        }

        // Logic for recurring event date/time updates:
        if (this.event_recurs && !this.event_is_recur_start) {
            if (value.getFullYear() !== this.event_start.getFullYear()
                || value.getMonth() !== this.event_start.getMonth()
                || value.getDate() !== this.event_start.getDate()
               ) {
                // If date changes, and not first event in recurring
                // can't set on all occurences.
                this.save_types[0]['disabled'] = true;
                if (this.recur_save_type === RecurSaveType.ALL_OCCURENCES) {
                    this.recur_save_type = RecurSaveType.THIS_ONLY;
                }
            }
        }
    }

    onDeleteClick(): void {
        const dialogData = { name: 'event' };
        if (this.event.recurs || this.event.isException) {
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
        }

        const dtstart = moment(this.event_start).seconds(0).milliseconds(0);
        let dtend = moment(this.event_end).seconds(0).milliseconds(0);

        // For a user it makes sense that a 2-day-long event starts on 1st and ends on 2nd.
        // For iCalendar however, that's a 1-day event since end dates are non-inclusive.
        //
        // Since the user is the sane one here, let's just make all allDay events one day
        // longer behind the scenes (that's how nextcloud does it too, for example).
        if (this.event_allDay) {
            // make sure we're going through the setter
            dtend = dtend.add(1, 'day');
        }

        this.event.updateEvent(
            dtstart,
            dtend,
            this.event_allDay,
            this.calendarFC.value,
            this.recur_save_type,
            this.event_title,
            this.event_location,
            this.event_description,
            this.event_recurs,
            this.recurring_frequency,
            this.recur_interval,
            this.recurring_frequency === 'WEEKLY'
                ? this.weekdays.filter((entry) => entry.recurs_on).map((entry) => entry.val)
                : this.recur_by_weekdays,
            this.recur_by_months,
            this.recur_by_monthyeardays);

        this.dialogRef.close(this.event);
    }
}
