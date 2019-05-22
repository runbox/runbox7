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
import { RRule, RRuleSet, rrulestr } from 'rrule';

import {
    addDays,
    addHours,
    addSeconds
} from 'date-fns';

import * as moment from 'moment';

export class Vevent {
    location?:    string;
    description?: string;
}

export class RunboxCalendarEvent implements CalendarEvent {
    id?:       string;
    start:     Date;
    end?:      Date;
    // we need those separately from start/end
    // start and end are for display pursposes only,
    // and will be different from dtstart/dtend in
    // recurring events
    dtstart:   moment.Moment;
    dtend?:    moment.Moment;
    title:     string;
    allDay?:   boolean;
    calendar:  string;
    rrule?:    RRule;

    vevent: Vevent = {};

    color     = {} as EventColor;
    draggable = true;

    constructor(event: any) {
        this.id = event.id;
        if (this.id) {
            this.calendar = this.id.split('/')[0];
        }

        if (event['VEVENT']) {
            const vevent = event['VEVENT'];
            this.dtstart = moment(vevent.dtstart, moment.ISO_8601);
            if (vevent.dtend) {
                this.dtend = moment(vevent.dtend, moment.ISO_8601);
            }
            this.title   = vevent.summary;
            this.allDay  = vevent.dtstart.indexOf('T') === -1;
            this.vevent  = vevent;
            if (vevent.rrule) {
                this.rrule = rrulestr(vevent.rrule);
                this.draggable = false;
            }
        } else {
            // "copy constructor" :)
            this.dtstart   = event.dtstart;
            this.dtend     = event.dtend;
            this.title     = event.title;
            this.allDay    = event.allDay;
            this.vevent    = event.vevent;
            this.rrule     = event.rrule;
            this.color     = event.color;
            this.draggable = event.draggable;
        }

        this.refreshDates();

        /*
        if (event.duration) {
            // https://tools.ietf.org/html/rfc2445#section-4.3.6
            const durationRE = /^([\+\-]?)PT?(\d+)([WHMSD])$/;
            const parts = durationRE.exec(event.duration);
            switch (parts[3]) {
                case 'D':
                    this.end = addDays(this.start, Number(parts[2]));
                    break;
                case 'H':
                    this.end = addHours(this.start, Number(parts[2]));
                    break;
                case 'S':
                    this.end = addSeconds(this.start, Number(parts[2]));
                    break;
                default:
                    throw new Error("Unsupported duration: " +  parts[3]);
            }
        }
        */
    }

    refreshDates(): void {
        // this method (re)sets the attributes required for displaying the event
        // based on the dates actually stored in it.
        //
        // They won't always be the same: each instance of a recurring event
        // will have a different start/end, but the same dtstart/dtend.

        this.start = this.dtstart.toDate();
        if (this.dtend) {
            this.end = this.dtend.toDate();
        }
    }

    setRecurringFrequency(frequency: number): void {
        if (frequency === -1) {
            if (this.rrule) {
                this.rrule = undefined;
            }
        } else {
            const ruleOpts = this.rrule ? this.rrule.origOptions : {};
            ruleOpts.freq  = frequency;
            this.rrule     = new RRule(ruleOpts);
        }
    }

    // borrowed from https://stackoverflow.com/a/36643588
    dateToJSON(date: Date): string {
        const timezoneOffsetInHours = -(date.getTimezoneOffset() / 60); // UTC minus local time
        const sign = timezoneOffsetInHours >= 0 ? '+' : '-';
        const leadingZero = (Math.abs(timezoneOffsetInHours) < 10) ? '0' : '';

        // It's a bit unfortunate that we need to construct a new Date instance 
        // (we don't want _date_ Date instance to be modified)
        const correctedDate = new Date(date.getFullYear(), date.getMonth(),
            date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(),
            date.getMilliseconds());
        correctedDate.setHours(date.getHours() + timezoneOffsetInHours);
        const iso = correctedDate.toISOString().replace('Z', '');

        return iso + sign + leadingZero + Math.abs(timezoneOffsetInHours).toString() + ':00';
    }

    toJSON(): any {
        let rruleLine: string;
        if (this.rrule) {
            rruleLine = this.rrule.toString().split('\n').find(l => l.indexOf('RRULE') === 0);
            if (rruleLine) {
                rruleLine = rruleLine.slice(6);
            }
        }
        return {
            id: this.id,
            calendar: this.calendar,
            VEVENT: {
                dtstart: this.dateToJSON(this.dtstart.toDate()),
                dtend: this.dtend ? this.dateToJSON(this.dtend.toDate()) : undefined,
                summary: this.title,
                location: this.vevent.location,
                description: this.vevent.description,
                rrule: rruleLine,
                _all_day: this.allDay
            }
        };
    }
}
