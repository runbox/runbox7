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

import { CalendarEvent } from 'angular-calendar';
import { EventColor } from 'calendar-utils';
import { RRule, rrulestr } from 'rrule';

import * as moment from 'moment';
import * as ICAL from 'ical.js';

export class RunboxCalendarEvent implements CalendarEvent {
    id?:       string;
    start:     Date;
    end?:      Date;

    color     = {} as EventColor;
    draggable = true;

    // we need those separately from start/end
    // start and end are for display pursposes only,
    // and will be different from dtstart/dtend in
    // recurring events
    calendar:  string;
    rrule?:    RRule;

    event: ICAL.Event = {};

    get title(): string {
        return this.event.summary;
    }

    set title(value: string) {
        this.event.summary = value;
    }

    get dtstart(): moment.Moment {
        return moment(this.event.startDate.toJSDate(), moment.ISO_8601);
    }

    get dtend(): moment.Moment {
        return this.event.endDate
            ? moment(this.event.endDate.toJSDate(), moment.ISO_8601)
            : undefined;
    }

    get allDay(): boolean {
        // isDate in ICAL.Event means "has no time"
        return this.event.startDate.isDate;
    }

    static fromIcal(id: string, ical: string): RunboxCalendarEvent {
        return new this(id, ICAL.parse(ical));
    }

    // creates an unnamed event for today
    static newEmpty(): RunboxCalendarEvent {
        return new this(
            undefined,
            [ 'vcalendar', [], [
                [ 'vevent',
                    [
                        [ 'dtend',   {}, 'date-time', '2019-10-02T14:00:00' ],
                        [ 'dtstart', {}, 'date-time', '2019-10-02T12:00:00' ],
                        [ 'summary', {}, 'text', '' ] ],
                    []
                ]
            ] ]
        );
    }

    constructor(id: string, jcal: any) {
        this.id = id;
        if (this.id) {
            this.calendar = this.id.split('/')[0];
        }

        const comp = new ICAL.Component(jcal);
        if (comp.name === 'vevent') {
            this.event = new ICAL.Event(comp);
        } else {
            this.event = new ICAL.Event(comp.getFirstSubcomponent('vevent'));
        }

        let rrule = this.event.component.getFirstPropertyValue('rrule');
        if (rrule) {
            rrule = rrule.toString(); // ICAL claims this should be a string, but sometimes it's not
            this.rrule = rrulestr(rrule, { dtstart: this.dtstart.toDate() });
        }

        this.refreshDates();
    }

    clone(): RunboxCalendarEvent {
        const ical = this.event.toString();
        return RunboxCalendarEvent.fromIcal(this.id, ical);
    }

    refreshDates(): void {
        // this method (re)sets the attributes required for displaying the event
        // based on the dates actually stored in it.
        //
        // They won't always be the same: each instance of a recurring event
        // will have a different start/end, but the same dtstart/dtend.

        this.start = this.dtstart.toDate();

        if (this.dtend) {
            // iCalendar uses non-inclusive end dates, while angular-calendar uses
            // inclusive ones. To counteract this, roll the end times back a little
            // so that they show properly
            const shownEnd = moment(this.dtend);
            if (this.allDay) {
                shownEnd.subtract(1, 'days');
            } else {
                shownEnd.subtract(1, 'seconds');
            }
            this.end = shownEnd.toDate();
        }
    }

    setRecurringFrequency(frequency: number): void {
        if (frequency === -1) {
            if (this.rrule) {
                this.rrule = undefined;
            }
        } else {
            const ruleOpts = this.rrule ? this.rrule.origOptions
                                        : { dtstart: this.dtstart.toDate() };
            ruleOpts.freq  = frequency;
            this.rrule     = new RRule(ruleOpts);
        }
    }

    // returns jCal
    toJSON(): any {
        return {
            id:       this.id,
            calendar: this.calendar,
            jcal:     this.event.component.toJSON(),
        };
    }
}
