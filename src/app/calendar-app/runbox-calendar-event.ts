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
import 'moment-timezone';
import * as ICAL from 'ical.js';

import { EventOverview } from './event-overview';

export class RunboxCalendarEvent implements CalendarEvent {
    id?:       string;

    // all recurrences of an event will have a parent set to the original one
    parent?: RunboxCalendarEvent;

    color     = {} as EventColor;
    draggable = true;

    // we need those separately from start/end
    // start and end are for display pursposes only,
    // and will be different from dtstart/dtend in
    // recurring events
    _calendar:  string;
    _old_id?:   string;

    ical: ICAL.Component;
    event: ICAL.Event;

    // *display* start/end - for reccurrences will not match the ICAL.Event
    private _dtstart: ICAL.Time;
    private _dtend: ICAL.Time;

    get calendar(): string {
        return this._calendar;
    }

    // Moving an event between calendars = unset id and store old one
    set calendar(value: string) {
        if (this.id) {
            console.log('Changing calendar, has an id');
            this._old_id = this.id;
            this.id = null;
        }
        this._calendar = value;
    }

    get title(): string {
        return this.event.summary;
    }

    set title(value: string) {
        this.event.summary = value;
    }

    get location(): string {
        return this.event.location;
    }

    set location(value: string) {
        this.event.location = value;
    }

    get description(): string {
        return this.event.description;
    }

    set description(value: string) {
        this.event.description = value;
    }

    get dtstart(): moment.Moment {
        return this.icalTimeToLocalMoment(this._dtstart);
    }

    // If set on an event with RRULE, updates entire repeated event
    // to now *start* from this new date
    // FIXME: Should we prompt for "only this instance" /
    // "this and future instances" and generate exceptions?
    // If set on an exception, only changes that exception
    set dtstart(value: moment.Moment) {
        const allDay = this.allDay;
        this._dtstart = ICAL.Time.fromJSDate(value.toDate());
        this.event.startDate = ICAL.Time.fromJSDate(value.toDate());
        // FIXME: Now we need to update _dtstart (display time)
        this._dtstart = this.event.startDate;
        // FIXME: regenerate all following events!?
        // Do we just let the save-to-dav / reloadEvents cycle do this for us?
        this.allDay = allDay;
    }

    get dtend(): moment.Moment {
        return this._dtend
            ? this.icalTimeToLocalMoment(this._dtend)
            : undefined;
    }

    // If set on an event with RRULE, updates entire repeated event
    // ?? Does this shorten it to one day ? (does it include the date)
    // If set on an exception, only changes that exception
    // FIXME: Does this change an ICAL.Time with no date (isDate=true) to
    // one with a time? (as a side effect that is)
    // See also set dtstart comments!
    set dtend(value: moment.Moment) {
        const allDay = this.allDay;
        this._dtend = ICAL.Time.fromJSDate(value.toDate());
        this.event.endDate = value ? ICAL.Time.fromJSDate(value.toDate()) : undefined;
        this._dtstart = this.event.endDate;
        this.allDay = allDay;
    }

    // angular-calendar compatibility

    get start(): Date {
        return this._dtstart.toJSDate();
    }

    get end(): Date {
        if (!this._dtend) {
            return undefined;
        }

        const shownEnd = this._dtend;
        // ICAL event DTEND is exclusive, angular-calendar is inclusive
        if (this.allDay) {
            shownEnd.addDuration(new ICAL.Duration({'isNegative': true, 'days': 1}));
        } else {
            shownEnd.addDuration(new ICAL.Duration({'isNegative': true, 'seconds': 1}));
        }
        return shownEnd.toJSDate();
    }

    get allDay(): boolean {
        // isDate in ICAL.Event means "has no time"
        return this._dtstart.isDate;
    }

    // DAILY, WEEKLY, MONTHLY etc
    get recurringFrequency(): string {
        const recur = this.event.component.getFirstPropertyValue('rrule');
        return recur ? recur.freq : '';
    }

    // FIXME: This will delete any rrule parts from imported events
    // that rb7's ui doesnt cope with
    // FIXME: rrule only wants updating on the "main" event, not here if this is an exception event!?
    // -> dont display the "recurring" select box on exception events?
    set recurringFrequency(frequency: string) {
        this.event.component.removeProperty('rrule');
        if (frequency !== '') {
            this.event.component.addPropertyWithValue('rrule', new ICAL.Recur({ freq: frequency }));
        }
    }

    set allDay(value) {
        this._dtstart.isDate = value;
        if (this._dtend) {
            this._dtend.isDate = value;
        }
        // I know this looks silly, but without this
        // ICAL.Event will not notice the isDate change
        // and the event metadata will still be off
        // FIXME: where is this set/used?
        // this.event.startDate = this._dtstart;
        // this.event.endDate   = this._dtend;
    }

    // creates an unnamed event for today
    static newEmpty(): RunboxCalendarEvent {
        return new this(
            undefined,
            new ICAL.Event(new ICAL.Component('vevent')),
            ICAL.Time.fromData({year: 2019, month: 10, day: 2, hour: 14, minute: 0}),
            ICAL.Time.fromData({year: 2019, month: 10, day: 2, hour: 14, minute: 0})
        );
    }

    // icalevent = VEVENT object for this instance (main rrule one if recurring)
    //           = OR VEVENT object for exception event (reccurrence-id, not rrule)
    // startdate = date/Time of *this instance* of a recurring event/exception
    // enddate   = date/Time of *this instance* of a recurring event/exception
    // if non-recurring, then the event/start/end of single item
    constructor(id: string, icalevent: ICAL.Event, startdate: ICAL.Time, enddate: ICAL.Time) {
        this.id = id;
        if (this.id) {
            this._calendar = this.id.split('/')[0];
        }

        if (startdate !== null && enddate === null) {
            enddate = startdate;
        }

        // Not sure how we get "no icalevent.component", came up in tests tho
        if (icalevent.component && icalevent.component.parent) {
            this.ical = icalevent.component.parent;
        } else {
            this.ical = new ICAL.Component('vcalendar');
            this.ical.addSubcomponent(icalevent.component);
        }
        this.event = icalevent;
        // starttime of this particular instance! if recurring, not
        // necessarily the same as event.dtstart
        this._dtstart = startdate;
        this._dtend = enddate;
    }

    // FIXME: do we still need this?
//    clone(): RunboxCalendarEvent {
//        return RunboxCalendarEvent.fromIcal(this.id, this.toIcal());
//    }

    get_overview(): EventOverview[] {
        const events = [];
        const seen = {};

        for (let e of this.ical.getAllSubcomponents('vevent')) {
            e = new ICAL.Event(e);

            // Skip duplicate uids (if defined),
            // to eliminate possible special cases in recurring events.
            if (e.uid && seen[e.uid]) {
                continue;
            } else {
                seen[e.uid] = true;
            }

            const rrule = e.component.getFirstPropertyValue('rrule');

            events.push(new EventOverview(
                e.summary,
                this.icalTimeToLocalMoment(e.startDate),
                e.endDate ? this.icalTimeToLocalMoment(e.endDate) : undefined,
                rrule ? rrule.freq : undefined,
                e.location,
                e.description,
            ));
        }

        return events;
    }

    // ICAL of the entire event (exceptions and all) - assuming it got updated?
    toIcal(): string {
        return this.ical.toString();
    }

    // returns jCal
    toJSON(): any {
        return {
            id:       this.id,
            calendar: this.calendar,
            jcal:     this.ical.toJSON(),
            ical:     this.toIcal(),
        };
    }

    private icalTimeToLocalMoment(time: ICAL.Time): moment.Moment {
        if (!time.zone) {
            // assume that the event is in localtime already
            return moment(time.toString());
        } else {
            // Theoretically, ICAL.Timezone.localTimezone exists.
            // Practically, it does not do anything. Let's go to UTC first.
            const utc = time.convertToZone(ICAL.Timezone.utcTimezone);
            // TODO localzone should perhaps be configurable
            return moment.utc(utc.toString()).tz(moment.tz.guess());
        }
    }
}
