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

import {
    addDays,
    addHours,
    addSeconds
} from 'date-fns';

import * as moment from 'moment';

export class RunboxCalendarEvent implements CalendarEvent {
    id?:       string;
    start:     Date;
    end?:      Date;
    title:     string;
    allDay?:   boolean;
    calendar:  string;

    color     = {} as EventColor;
    draggable = true;

    constructor(event: any) {
        this.id = event.id;
        if (this.id) {
            this.calendar = this.id.split('/')[0];
        }

        if (event['VEVENT']) {
            const vevent = event['VEVENT'];
            this.start   = moment(vevent.dtstart, moment.ISO_8601).toDate();
            if (vevent.dtend) {
                this.end = moment(vevent.dtend, moment.ISO_8601).toDate();
            }
            this.title   = vevent.summary;
            this.allDay  = vevent.dtstart.indexOf('T') === -1;
        } else {
            this.start  = event.start;
            this.end    = event.end;
            this.title  = event.title;
            this.allDay = event.allDay;
        }

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
        return {
            id: this.id,
            calendar: this.calendar,
            VEVENT: {
                dtstart: this.dateToJSON(this.start),
                dtend: this.end ? this.dateToJSON(this.end) : undefined,
                summary: this.title,
                _all_day: this.allDay
            }
        };
    }
}

