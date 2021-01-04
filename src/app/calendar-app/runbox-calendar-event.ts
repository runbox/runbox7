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

    // This is the start time of an event instance (if recurring)
    // See also: calendar.service.ts generateEvents
    get dtstart(): moment.Moment {
        return this.icalTimeToLocalMoment(this._dtstart);
    }

    // If set on an event with RRULE, updates entire repeated event
    // to now *start* from this new date
    // If set on an exception, only changes that exception
    set dtstart(value: moment.Moment) {
        const allDay = this.allDay;
        this._dtstart = this.momentToIcalTime(value, this.event.startDate ? this.event.startDate.zone : null);
        // FIXME: Do this only if its the first one?
        this.event.startDate = this._dtstart;
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
        if (value) {
            this._dtend = this.momentToIcalTime(value, this.event.endDate ? this.event.endDate.zone : undefined);
            // FIXME: (see above)
            this.event.endDate = this._dtend;
        }
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

        const shownEnd = this._dtend.clone();
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

    get recurs(): boolean {
        const recur = this.event.component.getFirstPropertyValue('rrule');
        return recur ? true : false;
    }

    set recurs(flag: boolean) {
        if (flag) {
            const recur = this.event.component.getFirstPropertyValue('rrule');
            if (!recur) {
                this.event.component.addPropertyWithValue('rrule', new ICAL.Recur({ freq: 'DAILY' }));
            }
        } else {
            this.event.component.removeProperty('rrule');
        }
    }

    // This is the original DTSTART of the event - if recurring, will different
    // from dtstart above.
    get recurStart(): Date {
        return this.event.startDate.toJSDate();
    }

    set recurStart(start: Date) {
        // Nope can't do that Dave
    }

    // DAILY, WEEKLY, MONTHLY etc
    get recurringFrequency(): string {
        const recur = this.event.component.getFirstPropertyValue('rrule');
        return recur ? recur.freq : '';
    }

    // Only set if the new value is different from the old one
    // Prevents us accidentally overwriting imported RRULE details
    // -> dont display the "recurring" select box on exception events?
    set recurringFrequency(frequency: string) {
        const recur = this.event.component.getFirstPropertyValue('rrule');
        if (recur) {
            recur.freq = frequency;
            this.event.component.updatePropertyWithValue('rrule', recur);
        } else {
            this.event.component.addPropertyWithValue('rrule', new ICAL.Recur({ freq: frequency }));
        }
    }

    // How often does this repeat (every X freqs)
    get recurInterval(): number {
        const recur = this.event.component.getFirstPropertyValue('rrule');
        return recur ? recur.interval : 1;
    }

    set recurInterval(interval: number) {
        const recur = this.event.component.getFirstPropertyValue('rrule');
        recur.interval = interval;
        this.event.component.updatePropertyWithValue('rrule', recur);
    }

    // An UNTIL date, a COUNT or null = unset/repeats forever
    get recurEnds(): Date | number {
        const recur = this.event.component.getFirstPropertyValue('rrule');
        if (recur && recur.until) {
            return recur.until.toJSDate();
        }
        if (recur && recur.count) {
            return recur.count;
        }
        return null;
    }

    set recurEnds(end: Date | number) {
        const recur = this.event.component.getFirstPropertyValue('rrule');
        recur.until = null;
        recur.count = null;
        if (typeof end === 'number' && end != null) {
            recur.count = end;
        }
        if (end instanceof Date &&  end != null) {
            // Must be a date (cant do typeof === 'Date' !?
            const zone = this.event.startDate.zone;
            const icaltime = ICAL.Time.fromJSDate(end);
            icaltime.zone = zone;
            recur.until = icaltime;
        }
        // else, everything null, repeats forever.
        this.event.component.updatePropertyWithValue('rrule', recur);
    }

    // get "part"s, eg byday, bymonthday, bymonth, byyearday, byweekno

    // One or more days of the week this rule could run on (or none)
    // SU, MO etc (or can convert to days of week using .icalDayToNumericDay
    // if a monthly BYDAY, could be "\+?1SU" or "-2TU" etc
    get recursByDay(): string[] {
        const recur = this.event.component.getFirstPropertyValue('rrule');
        if (!recur) {
            return [];
        }
        const bydays = recur.getComponent('byday');
        const rgx = /^([+-]?\d+)?(\w{2})$/;
        const bydays_mapped = bydays.map((day) => {
            const match = day.match(rgx);
            const numth = match[1] ? match[1] : '0';
            return { 'day': match[2], 'numth': numth };
        });
        return bydays_mapped;
    }

    // replace entire list of day(s)
    set recursByDay(value: string[]) {
        const recur = this.event.component.getFirstPropertyValue('rrule');
        recur.setComponent('byday', value);
        this.event.component.updatePropertyWithValue('rrule', recur);
    }

    get recursByMonthDay(): string[] {
        const recur = this.event.component.getFirstPropertyValue('rrule');
        if (!recur) {
            return [];
        }
        const bymonthdays = recur.getComponent('bymonthday');
        return bymonthdays.map((day) => day.toString());
    }

    set recursByMonthDay(value: string[]) {
        const recur = this.event.component.getFirstPropertyValue('rrule');
        recur.setComponent('bymonthday', value);
        this.event.component.updatePropertyWithValue('rrule', recur);
    }

    get recursByYearDay(): string[] {
        const recur = this.event.component.getFirstPropertyValue('rrule');
        if (!recur) {
            return [];
        }
        const byyeardays = recur.getComponent('byyearday');
        return byyeardays.map((day) => day.toString());
    }

    set recursByYearDay(value: string[]) {
        const recur = this.event.component.getFirstPropertyValue('rrule');
        recur.setComponent('byyearday', value);
        this.event.component.updatePropertyWithValue('rrule', recur);
    }

    get recursByMonth(): string[] {
        const recur = this.event.component.getFirstPropertyValue('rrule');
        if (!recur) {
            return [];
        }
        const bymonth = recur.getComponent('bymonth');
        return bymonth.map((month) => month.toString());
    }

    set recursByMonth(value: string[]) {
        const recur = this.event.component.getFirstPropertyValue('rrule');
        recur.setComponent('bymonth', value);
        this.event.component.updatePropertyWithValue('rrule', recur);
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

    get isException(): boolean {
        return this.event.component.hasProperty('recurrence-id');
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

    // An exception to the main (recurring) event
    addExceptionEvent(
        origdate: moment.Moment,
        startdate: moment.Moment,
        enddate: moment.Moment,
        thisandfuture: boolean,
        title: string,
        description: string,
        location: string): boolean {
        if (this.isException) {
            // This shouldnt be possible
            console.log('Refusing to create an exception of an exception');
            return false;
        }
        // clone existing one
        const new_exception = new ICAL.Event(ICAL.Component.fromString(this.event.toString()));
        new_exception.component.removeProperty('rrule');
        const recurrence_id = this.momentToIcalTime(origdate, this.event.startDate.zone);
        const new_start = this.momentToIcalTime(startdate, this.event.startDate.zone);
        const new_end = this.momentToIcalTime(enddate, this.event.startDate.zone);
        new_exception.recurrenceId = recurrence_id;
        if (thisandfuture) {
            // add RANGE=THISANDFUTURE
            const rId = new_exception.component.getFirstProperty('recurrence-id');
            rId.setParameter('range', 'THISANDFUTURE');
            // new_exception.component.updatePropertyWithValue('recurrence-id',rId);
        }
        new_exception.startDate = new_start;
        new_exception.endDate = new_end;
        if (title) {
            new_exception.summary = title;
        }
        if (description) {
            new_exception.description = description;
        }
        if (location) {
            new_exception.location = location;
        }
        this.ical.addSubcomponent(new_exception.component);
        // recreate this.event to sort out the exceptions/recurrences?
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

    private momentToIcalTime(input: moment.Moment, zone: ICAL.Timezone): ICAL.Time {
        if (!zone) {
            // This should probably use tz.guess() ?
            zone = ICAL.Timezone.utcTimezone;
        }
        const ical_time = ICAL.Time.fromJSDate(input.toDate());
        ical_time.zone = zone;
        return ical_time;
    }
}
