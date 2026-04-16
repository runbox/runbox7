// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2021 Runbox Solutions AS (runbox.com).
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

import moment from 'moment';
import 'moment-timezone';
import ICAL from 'ical.js';

import { EventOverview } from './event-overview';

export enum RecurSaveType {
    ALL_OCCURENCES,
    THIS_ONLY,
    THIS_AND_FUTURE,
}

export class RunboxCalendarEvent implements CalendarEvent {
    id?:       string;

    // Timezone of the user viewing the event
    // Used as default for new events
    // and to convert to when viewing any other events (imported or via caldav)
    timezone?: string;
    // all recurrences of an event will have a parent set to the original one
    parent?: RunboxCalendarEvent;

    color     = {} as EventColor;
    draggable = true;

    // we need those separately from start/end
    // start and end are for display pursposes only,
    // and will be different from dtstart/dtend in
    // recurring events
    _calendar!:  string;
    _old_id?:   string;

    ical: ICAL.Component;
    event: ICAL.Event;

    // *display* start/end - for reccurrences will not match the ICAL.Event
    private _dtstart!: ICAL.Time;
    private _dtend!: ICAL.Time;

    // store user's selection of allDay setting while updating the event
    // required cos neither Moment nor Date have a "date only" functionality
    // ICAL.Time does tho!
    private _allDay!: boolean;

    get calendar(): string {
        return this._calendar;
    }

    // Moving an event between calendars = unset id and store old one
    set calendar(value: string) {
        if (this.id && value !== this._calendar) {
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
        return this.icalTimeToMoment(this._dtstart);
    }

    // If set on an event with RRULE, updates entire repeated event
    // to now *start* from this new date
    // If set on an exception, only changes that exception
    set dtstart(value: moment.Moment) {
        // check this before we update:
        if (this._dtstart.toJSDate().toString() === this.recurStart.toString()) {
            this._dtstart = this.momentToIcalTime(value, this.event.startDate ? this.event.startDate.zone : ICAL.Timezone.utcTimezone);
            this.event.startDate = this._dtstart;
        }
    }

    get dtend(): moment.Moment {
        return this._dtend
            ? this.icalTimeToMoment(this._dtend)
            : undefined;
    }

    // If set on an event with RRULE, updates entire repeated event
    // ?? Does this shorten it to one day ? (does it include the date)
    // If set on an exception, only changes that exception
    // FIXME: Does this change an ICAL.Time with no date (isDate=true) to
    // one with a time? (as a side effect that is)
    set dtend(value: moment.Moment) {
        if (value && this._dtstart.toJSDate().toString() === this.recurStart.toString()) {
            this._dtend = this.momentToIcalTime(value, this.event.endDate ? this.event.endDate.zone : ICAL.Timezone.utcTimezone);
            this.event.endDate = this._dtend;
        }
    }

    // angular-calendar compatibility

    get start(): Date {
        return this.convertIcalTimeToDate(this._dtstart, 'dtstart');
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

        return this.convertIcalTimeToDate(shownEnd, 'dtend');
    }

    /**
     * Convert an ICAL.Time to a JavaScript Date with proper timezone handling.
     *
     * Handles three cases:
     * 1. Proper timezone (has VTIMEZONE data or UTC) → convert to user's display timezone
     * 2. True floating time (no TZID in property) → interpret in calendar's timezone
     * 3. Unresolved TZID (has TZID but not found) → preserve local time values as UTC
     */
    private convertIcalTimeToDate(time: ICAL.Time, propName: string): Date {
        const zone = time.zone;
        // Check for proper timezone with VTIMEZONE data or UTC
        const hasProperTimezone = zone &&
            typeof zone === 'object' &&
            zone.tzid &&
            zone.tzid !== 'floating' &&
            (zone.component || zone.tzid === 'UTC');

        if (hasProperTimezone) {
            const targetTz = this.getAccountTimezone();
            if (targetTz) {
                time = time.convertToZone(targetTz);
            }
            return time.toJSDate();
        }

        // Check if the property had a TZID parameter to differentiate floating vs unresolved
        const prop = this.event.component.getFirstProperty(propName);
        const hasTzidParam = prop && prop.getParameter('tzid');

        if (!hasTzidParam) {
            // True floating time - interpret in calendar's timezone
            // First try ICAL.TimezoneService (for non-standard paths with VTIMEZONE data)
            const calendarTz = this.getAccountTimezone();

            if (calendarTz) {
                // Create time directly in calendar's timezone, then convert to UTC via toJSDate()
                const localTime = new ICAL.Time({
                    year: time.year,
                    month: time.month,
                    day: time.day,
                    hour: time.hour,
                    minute: time.minute,
                    second: time.second
                }, calendarTz);
                return localTime.toJSDate();
            }

            // Try moment-timezone for standard IANA timezones
            const momentZone = this.timezone ? moment.tz.zone(this.timezone) : null;
            if (momentZone) {
                const m = moment.tz([
                    time.year,
                    time.month - 1,
                    time.day,
                    time.hour,
                    time.minute,
                    time.second,
                    0
                ], this.timezone || 'UTC');
                return m.toDate();
            }

            // Fallback: no calendar timezone available, preserve local time as UTC
            return this.icalTimeToUTCDate(time);
        }

        // Unresolved TZID or no calendar timezone - preserve local time values
        return this.icalTimeToUTCDate(time);
    }

    private icalTimeToUTCDate(time: ICAL.Time): Date {
        return new Date(Date.UTC(
            time.year,
            time.month - 1,
            time.day,
            time.hour,
            time.minute,
            time.second
        ));
    }

    set allDay(value) {
        this._dtstart.isDate = value;
        if (this._dtend) {
            this._dtend.isDate = value;
        }
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

    // This is the original DTSTART of the event - if recurring, could
    // be different from dtstart above. Matches if its an exception.
    get recurStart(): Date {
        return this.event.startDate.toJSDate();
    }

    // DAILY, WEEKLY, MONTHLY etc
    get recurringFrequency(): string {
        return this.getRecur()?.freq || '';
    }

    // Only set if the new value is different from the old one
    // Prevents us accidentally overwriting imported RRULE details
    // -> dont display the "recurring" select box on exception events?
    set recurringFrequency(frequency: string) {
        const recur = this.getRecur();
        if (recur) {
            recur.freq = frequency;
            this.event.component.updatePropertyWithValue('rrule', recur);
        } else {
            this.event.component.addPropertyWithValue('rrule', new ICAL.Recur({ freq: frequency }));
        }
    }

    // How often does this repeat (every X freqs)
    get recurInterval(): number {
        return this.getRecur()?.interval || 1;
    }

    set recurInterval(interval: number) {
        const recur = this.getRecur();
        if (recur) {
            recur.interval = interval;
            this.event.component.updatePropertyWithValue('rrule', recur);
        }
    }

    // An UNTIL date, a COUNT or null = unset/repeats forever
    get recurEnds(): Date | number | null {
        const recur = this.getRecur();
        if (recur) {
            if (recur.until) {
                return recur.until.toJSDate();
            }
            if (recur.count) {
                return recur.count;
            }
        }
        return null;
    }

    set recurEnds(end: Date | number) {
        const recur = this.getRecur();
        if (recur) {
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
    }

    // get "part"s, eg byday, bymonthday, bymonth, byyearday, byweekno

    // One or more days of the week this rule could run on (or none)
    // SU, MO etc (or can convert to days of week using .icalDayToNumericDay
    // if a monthly BYDAY, could be "\+?1SU" or "-2TU" etc
    get recursByDay(): { day: string; numth: string }[] {
        const recur = this.getRecur();
        if (!recur) {
            return [];
        }
        const bydays = recur.getComponent('byday');
        const rgx = /^([+-]?\d+)?(\w{2})$/;
        const bydays_mapped = bydays.map((day: string) => {
            const match = day.match(rgx);
            const numth = match && match[1] ? match[1] : '0';
            return { 'day': match && match[2] ? match[2] : '', 'numth': numth };
        });
        return bydays_mapped;
    }

    // replace entire list of day(s)
    set recursByDay(value: string[]) {
        const recur = this.getRecur();
        if (recur) {
            recur.setComponent('byday', value);
            this.event.component.updatePropertyWithValue('rrule', recur);
        }
    }

    get recursByMonthDay(): string[] {
        const recur = this.getRecur();
        if (!recur) {
            return [];
        }
        const bymonthdays = recur.getComponent('bymonthday');
        return bymonthdays.map((day: string) => day.toString());
    }

    set recursByMonthDay(value: string[]) {
        const recur = this.getRecur();
        if (recur) {
            recur.setComponent('bymonthday', value);
            this.event.component.updatePropertyWithValue('rrule', recur);
        }
    }

    get recursByYearDay(): string[] {
        const recur = this.getRecur();
        if (!recur) {
            return [];
        }
        const byyeardays = recur.getComponent('byyearday');
        return byyeardays.map((day: string) => day.toString());
    }

    set recursByYearDay(value: string[]) {
        const recur = this.getRecur();
        if (recur) {
            recur.setComponent('byyearday', value);
            this.event.component.updatePropertyWithValue('rrule', recur);
        }
    }

    // Jan-Dec numbered 1-12
    get recursByMonth(): string[] {
        const recur = this.getRecur();
        if (!recur) {
            return [];
        }
        const bymonth = recur.getComponent('bymonth');
        return bymonth.map((month: string) => month.toString());
    }

    set recursByMonth(value: string[]) {
        const recur = this.getRecur();
        if (recur) {
            recur.setComponent('bymonth', value);
            this.event.component.updatePropertyWithValue('rrule', recur);
        }
    }

    get isException(): boolean {
        return this.event.component.hasProperty('recurrence-id');
    }

    // creates an unnamed event for today
    static newEmpty(timezone?: string): RunboxCalendarEvent {
        const icalevent = new ICAL.Event(new ICAL.Component('vevent'));
        icalevent.startDate = ICAL.Time.now();
        return new this(
            undefined,
            icalevent,
            icalevent.startDate,
            icalevent.startDate,
            timezone
        );
    }

    // icalevent = VEVENT object for this instance (main rrule one if recurring)
    //           = OR VEVENT object for exception event (reccurrence-id, not rrule)
    // startdate = date/Time of *this instance* of a recurring event/exception
    // enddate   = date/Time of *this instance* of a recurring event/exception
    // if non-recurring, then the event/start/end of single item
    constructor(id: string, icalevent: ICAL.Event, startdate: ICAL.Time, enddate: ICAL.Time, timezone?: string) {
        this.id = id;
        this.timezone = timezone;
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
        origdate: ICAL.Time,
        startdate: moment.Moment,
        enddate: moment.Moment,
        thisandfuture: boolean,
        title: string,
        description: string,
        location: string): boolean | undefined {
        if (this.isException) {
            // This shouldnt be possible
            console.log('Refusing to create an exception of an exception');
            return false;
        }
        // clone existing one
        const new_exception = new ICAL.Event(ICAL.Component.fromString(this.event.toString()));
        new_exception.component.removeProperty('rrule');
        const recurrence_id = origdate;
        const new_start = this.momentToIcalTime(startdate, this.event.startDate.zone || ICAL.Timezone.utcTimezone);
        let new_end: ICAL.Time | undefined;
        if (enddate) {
            new_end = this.momentToIcalTime(enddate, this.event.startDate.zone || ICAL.Timezone.utcTimezone);
        }
        if (this._dtstart.isDate) {
            recurrence_id.isDate = true;
            new_start.isDate = true;
            if (new_end) {
                new_end.isDate = true;
            }
        }
        new_exception.recurrenceId = recurrence_id;
        if (thisandfuture) {
            const rId = new_exception.component.getFirstProperty('recurrence-id');
            if (rId) {
                rId.setParameter('range', 'THISANDFUTURE');
            }
        }
        new_exception.startDate = new_start;
        if (new_end) {
            new_exception.endDate = new_end;
        }
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
        // regenerate this.event to sort out the exceptions/recurrences?
    }

    // set values from edit dialog, inc logic for recurring
    // parts + exception creation.
    updateEvent(
        dtstart:        moment.Moment,
        dtend:          moment.Moment,
        allDay:         boolean,
        calendar:       string,
        recur_save_type: RecurSaveType,
        title:          string,
        location:       string,
        description:    string,
        recurs:         boolean,
        frequency:      string,
        interval:       number,
        recur_weekdays: string[],
        recur_months:   string[],
        recur_nth:      string[],
    ) {
        if (this.recurs && recur_save_type !== RecurSaveType.ALL_OCCURENCES) {
            // Adding an exception to an already recurring event
            this.addExceptionEvent(
                this._dtstart,
                dtstart,
                dtend,
                recur_save_type === RecurSaveType.THIS_AND_FUTURE ? true : false,
                title,
                description,
                location);
        } else {
            this._allDay     = allDay;
            this.dtstart     = dtstart;
            this.dtend       = dtend;
            this.calendar    = calendar;
            if (title) {
                this.title       = title;
            }
            if (location) {
                this.location    = location;
            }
            if (description) {
                this.description = description;
            }

            if (recurs) {
                // New recurring event, didn't recur before, or updating
                // whole recurring event
                this.recurs = true;
                this.recurringFrequency = frequency;
                this.recurInterval = interval;
                if (frequency === 'WEEKLY') {
                    // Repeats on one or more days every week
                    this.recursByDay = recur_weekdays;
                } else if (frequency === 'MONTHLY'
                    || frequency === 'YEARLY') {
                    // Repeats on either: eg: 1st,(2nd, 3rd) Tuesday, or 17th, (18th, 19th) day
                    if (recur_weekdays.length === 1
                        && recur_weekdays[0] === 'day') {
                        if (frequency === 'YEARLY'
                            && recur_months.length === 1
                            && recur_months[0] === 'year') {
                            // Nth day of the year
                            this.recursByYearDay = recur_nth;
                        } else {
                            // Nth day of the month
                            this.recursByMonthDay = recur_nth;
                            if (frequency === 'YEARLY') {
                                this.recursByMonth = recur_months;
                            }
                        }
                    } else {
                        // Nth <?>day:
                        // If Nth is 0, then skip adding a number
                        // (means eg "all tuesdays in the month")
                        const weekdays = [];
                        if (recur_weekdays.length === recur_nth.length) {
                            for (let i = 0; i < recur_weekdays.length; i++) {
                                const recur_monthday = recur_nth[i] !== '0' ? recur_nth[i] : '';
                                weekdays.push(recur_monthday + recur_weekdays[i]);
                            }
                        } else {
                            // picked one Nth and multiple days?
                            for (let i = 0; i < recur_weekdays.length; i++) {
                                const recur_monthday = recur_nth[i] !== '0' ? recur_nth[i] : '';
                                weekdays.push(recur_monthday + recur_weekdays[i]);
                            }
                        }
                        // list of 1TU,2WE etc
                        this.recursByDay = weekdays;

                        if (frequency === 'YEARLY'
                            && recur_months[0] !== 'year') {
                            // occurs on Nth <X>day in particular months:
                            this.recursByMonth = recur_months;
                        }
                    }
                }
            }
        }
    }


    get_overview(): EventOverview[] {
        const events = [];
        const seen: { [key: string]: boolean } = {};

        for (const component of this.ical.getAllSubcomponents('vevent')) {
            const event = new ICAL.Event(component);

            // Skip duplicate uids (if defined),
            // to eliminate possible special cases in recurring events.
            if (event.uid && seen[event.uid]) {
                continue;
            } else {
                seen[event.uid] = true;
            }

            const rrule = event.component.getFirstPropertyValue('rrule');

            events.push(new EventOverview(
                event.summary,
                this.icalTimeToMoment(event.startDate),
                event.endDate ? this.icalTimeToMoment(event.endDate) : undefined,
                (rrule instanceof ICAL.Recur) ? rrule.freq : undefined,
                event.location,
                event.description,
            ));
        }

        return events;
    }

    // ICAL of the entire event (exceptions and all) - assuming it got updated?
    toIcal(): string {
        return this.ical.toString();
    }

    // Incoming ICAL.Time may (probably) has its own timezone set
    // outgoing Moment needs to have the user's tz set.
    private icalTimeToMoment(time: ICAL.Time): moment.Moment {
        if (!time.zone) {
            // assume that the event is in localtime already
            return moment(time.toString());
        } else {
            // Assemble a moment with the UTC Date() and the user's timezone
            let my_timezone: string | null = time.zone && time.zone.component ? time.zone.component.getFirstPropertyValue('x-lic-location') as string : null;
            my_timezone = my_timezone || this.timezone || moment.tz.guess();
            const m = moment(time.toJSDate()).tz(my_timezone);
            return m;
        }
    }

    /** Safely get the RRULE as an ICAL.Recur, or null if missing/not a Recur instance. */
    private getRecur(): ICAL.Recur | null {
        const recur = this.event.component.getFirstPropertyValue('rrule');
        return (recur && recur instanceof ICAL.Recur) ? recur : null;
    }

    /** Get the account timezone from ICAL.TimezoneService, or null if unset/unregistered. */
    private getAccountTimezone(): ICAL.Timezone | null {
        return this.timezone ? ICAL.TimezoneService.get(this.timezone) : null;
    }

    private momentToIcalTime(input: moment.Moment, zone: ICAL.Timezone | null | undefined): ICAL.Time {
        // No supplied tz = new, or original didnt have one:
        // (Is it legit to have dates with tzs and without in same ical?)
        if (!zone || zone.tzid === 'floating') {
            const my_timezone = this.timezone || moment.tz.guess();
            zone = ICAL.TimezoneService.get(my_timezone) || ICAL.Timezone.utcTimezone;
            // Possibly also need to add the VTIMEZONE component
            if (zone && zone.tzid !== 'UTC'
                && !this.ical.getFirstSubcomponent('vtimezone')) {
                this.ical.addSubcomponent(zone.component);
            }
            const ical_time = ICAL.Time.fromJSDate(input.toDate());
            ical_time.zone = zone;
            ical_time.isDate = this._allDay;
            return ical_time;
        }
        // input is date in browser-local time, convert to target timezone via UTC.
        // Using UTC as intermediate avoids double-conversion when browser tz
        // differs from account tz (the moment's UTC representation is always correct).
        const d = input.toDate();
        const ical_tztime = new ICAL.Time({
            year: d.getUTCFullYear(),
            month: d.getUTCMonth() + 1,
            day: d.getUTCDate(),
            hour: d.getUTCHours(),
            minute: d.getUTCMinutes(),
            second: d.getUTCSeconds()
        });
        ical_tztime.zone = ICAL.Timezone.utcTimezone;
        ical_tztime.isDate = this._allDay;
        return ical_tztime.convertToZone(zone);
    }
}
