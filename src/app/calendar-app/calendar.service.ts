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

import { RunboxCalendar } from './runbox-calendar';
import { RunboxCalendarEvent } from './runbox-calendar-event';
import { RunboxWebmailAPI, RunboxMe } from '../rmmapi/rbwebmail';
import { StorageService } from '../storage.service';
import { BackgroundActivityService } from '../common/background-activity.service';
import { ViewPeriod } from 'calendar-utils';

import { Injectable, OnDestroy } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, ReplaySubject, AsyncSubject } from 'rxjs';

import moment from 'moment';
import ICAL from 'ical.js';

enum Activity {
    LoadingCache        = 'Loading local cache',
    CreatingCalendar    = 'Creating Calendar',
    CreatingEvent       = 'Creating Event',
    DeletingCalendar    = 'Deleting Calendar',
    DeletingEvent       = 'Deleting Event',
    EditingCalendar     = 'Editing Calendar',
    EditingEvent        = 'Editing Event',
    RefreshingCalendars = 'Refreshing Calendars',
    RefreshingEvents    = 'Refreshing Events',
    GeneratingEvents    = 'Generating Events',
}

@Injectable()
export class CalendarService implements OnDestroy {
    calendars:    RunboxCalendar[]      = [];
    events:       RunboxCalendarEvent[] = [];
    // Stores ICAL.Events, one per single/recurring item, with .exceptions set
    icalevents:   { id: string, event: ICAL.Event}[] = [];

    syncTokens = {};
    syncInterval: any;
    syncIntervalSeconds = 15;
    lastUpdate: moment.Moment;

    calendarSubject = new ReplaySubject<RunboxCalendar[]>(1);
    eventSubject    = new ReplaySubject<RunboxCalendarEvent[]>(1);
    errorLog        = new Subject<HttpErrorResponse>();

    activities      = new BackgroundActivityService<Activity>();

    me: RunboxMe    = new RunboxMe();

    userTimezoneLoaded = new AsyncSubject<ICAL.Timezone>();

    constructor(
        private rmmapi:  RunboxWebmailAPI,
        private storage: StorageService,
    ) {
        // Load user's predefined timezone, and register a corresponding
        // VTIMEZONE for their events to use
        this.rmmapi.me.subscribe(me => {
            this.me = me;
            this.loadVTimezone(this.me.timezone);
        });

        // We need the user's timezone to display their events:
        this.userTimezoneLoaded.subscribe((tzone) => {
            // Is this clever.. ?
            this.me.timezone = tzone.tzid;
            storage.get('caldavCache').then(cache => {
                if (!cache) {
                    return;
                }
                console.log('Cache version:', cache['version']);
                // eslint-disable-next-line eqeqeq
                if (cache['version'] != 4) {
                    console.log('Old cache format found, removing');
                    storage.set('caldavCache', undefined);
                    return;
                }
                this.activities.begin(Activity.LoadingCache);
                console.log('Loading calendars/events from local cache');
                this.calendars = cache['calendars'].map((c: any) => new RunboxCalendar(c));
                for (const cal of this.calendars) {
                    this.syncTokens[cal.id] = cal.syncToken;
                }
                const runboxevents = cache['events'].map((e: any) => {
                    const ievent = this.importFromIcal(e.id, e.ical);
                    return this.generateEvents(undefined, undefined, [ievent]);
                });
                runboxevents.forEach((events) => this.events = this.events.concat(events));
                this.calendarSubject.next(this.calendars);
                this.eventSubject.next(this.events);
                this.activities.end(Activity.LoadingCache);
            }).then(
                () => this.syncCaldav(),
            );
        });

        this.calendarSubject.subscribe(cals => {
            const updatedCals = [];
            for (const cal of cals) {
                if (cal.syncToken !== this.syncTokens[cal.id]) {
                    updatedCals.push(cal.id);
                    this.syncTokens[cal.id] = cal.syncToken;
                }
            }

            if (updatedCals.length > 0) {
                console.log('Changes detected in calendars', updatedCals);
                this.reloadEvents();
            } else {
                console.log('Nothing new in calendars');
                this.lastUpdate = moment();
            }
        });

        this.eventSubject.subscribe(_ => {
            this.saveCache();
            this.lastUpdate = moment();
        });

        this.syncInterval = setInterval(() => {
            this.syncCaldav();
        }, this.syncIntervalSeconds * 1000);
    }

    ngOnDestroy() {
        clearInterval(this.syncInterval);
    }

    addCalendar(calendar: RunboxCalendar): Promise<void> {
        return new Promise((resolve, reject) => {
            this.activities.begin(Activity.CreatingCalendar);
            this.rmmapi.addCalendar(calendar).subscribe(() => {
                console.log('Calendar created!');
                this.calendars.push(calendar);
                this.calendarSubject.next(this.calendars);
                resolve();
                this.activities.end(Activity.CreatingCalendar);
            }, e => {
                this.apiErrorHandler(e);
                reject();
                this.activities.end(Activity.CreatingCalendar);
            });
        });
    }

    addEvent(event: RunboxCalendarEvent): Promise<string> {
        return new Promise((resolve, reject) => {
            this.activities.begin(Activity.CreatingEvent);
            this.rmmapi.addCalendarEvent(event).subscribe(res => {
                console.log('Event created:', res);
                event.id = res.id;
                this.events.push(event);
                this.eventSubject.next(this.events);
                resolve(event.id);
                this.activities.end(Activity.CreatingEvent);
            }, e => {
                this.apiErrorHandler(e);
                reject(e);
                this.activities.end(Activity.CreatingEvent);
            });
        });
    }

    apiErrorHandler(e: HttpErrorResponse): void {
        this.errorLog.next(e);
    }

    deleteCalendar(id: string) {
        this.activities.begin(Activity.DeletingCalendar);
        this.rmmapi.deleteCalendar(id).subscribe(() => {
            console.log('Calendar deleted:', id);
            const idx = this.calendars.findIndex(c => c.id === id);
            this.calendars.splice(idx, 1);
            // also delete all events that came from that calendar
            // (just from the view; DAV will delete them along with the calendar)
            this.events = this.events.filter(e => e.calendar !== id);

            this.calendarSubject.next(this.calendars);
            this.eventSubject.next(this.events);
            this.activities.end(Activity.DeletingCalendar);
        }, e => {
            this.apiErrorHandler(e);
            this.activities.end(Activity.DeletingCalendar);
        });
    }

    deleteEvent(id: string) {
        this.activities.begin(Activity.DeletingEvent);
        this.rmmapi.deleteCalendarEvent(id).subscribe(res => {
            console.log('Event deleted:', res);
            const idx = this.events.findIndex(e => e.id === id);
            this.events.splice(idx, 1);
            this.eventSubject.next(this.events);
            this.activities.end(Activity.DeletingEvent);
        }, e => {
            this.apiErrorHandler(e);
            this.activities.end(Activity.DeletingEvent);
        });
    }

    fixICALEvent(icalevent: ICAL.Event): ICAL.Event {
        // check if the rrule is specific enough:
        const test_iterator = icalevent.iterator();
        // V2+ does not allow multiple RRULES (so sabre will reject em?)
        const rule_iterator = test_iterator.ruleIterators[0];

        // fixup underspecified rules
        // (or else figure out the nearest one to our start date but ick)
        // clone the recur object to update it:
        const new_rule = rule_iterator.rule.clone();
        const event_start = icalevent.startDate;
        if (rule_iterator.rule.freq === 'WEEKLY'
            && !rule_iterator.has_by_data('BYDAY')) {
            // set BYDAY to the day of the DTSTART
            new_rule.addComponent(
                'BYDAY',
                ICAL.Recur.numericDayToIcalDay(event_start.dayOfWeek())
            );
        } else if (rule_iterator.rule.freq === 'MONTHLY'
            && !rule_iterator.has_by_data('BYMONTHDAY')
            && !rule_iterator.has_by_data('BYDAY') ) {
            // set BYMONTHDAY
            new_rule.addComponent(
                'BYMONTHDAY',
                event_start.day
            );
        } else if (rule_iterator.rule.freq === 'YEARLY'
            && !rule_iterator.has_by_data('BYDAY')
            && !rule_iterator.has_by_data('BYMONTHDAY')) {
            // set BYMONTH && BYMONTHDAY from DTSTART
            new_rule.addComponent(
                'BYMONTH',
                event_start.month
            );
            new_rule.addComponent(
                'BYMONTHDAY',
                event_start.day
            );
        }

        // set hour/min/sec if not set:
        if (!event_start.isDate) {
            if (!rule_iterator.has_by_data('BYHOUR')) {
                new_rule.addComponent('BYHOUR', event_start.hour);
            }
            // set min if not set:
            if (!rule_iterator.has_by_data('BYMINUTE')) {
                new_rule.addComponent('BYMINUTE', event_start.minute);
            }
            // set sec if not set:
            if (!rule_iterator.has_by_data('BYSECOND')) {
                new_rule.addComponent('BYSECOND', event_start.second);
            }
        }
        // update if changed:
        if (new_rule.toString() !== rule_iterator.rule.toString()) {
            icalevent.component.updatePropertyWithValue('rrule', new_rule);
        }

        // this is based on the updated RRULE, I hope:
        // UNTIL is already coped with, infinite is fine
        // COUNT is the only one based on the DTSTART date.
        if (rule_iterator.rule.isByCount()) {
            // ends on a counted number of occurrences, bah humbug
            // did we calculate this already?
            if (!icalevent.component.parent.hasProperty('X-RUNBOX-CALCULATED-DTEND')) {
                // calculate enddate + store it (loop until end)
                const updated_iterator = icalevent.iterator();
                let next_time = updated_iterator.next();
                let last_time;
                while ( next_time ) {
                    last_time = next_time;
                    next_time = updated_iterator.next();
                }
                // next_time is the end time!
                icalevent.component.parent.addPropertyWithValue('X-RUNBOX-CALCULATED-DTEND', last_time.toString());
            }
        }
        // this or the ical string and reparse it?
        return icalevent;
    }

    // each ical "event" represents one or more items on the actual calendar
    // eg for recurrening events. create N RunboxCalendarEvents, one per visible
    // item, set their specific dtstart date, store the same ICAL.Event.
    // an exception ICAL.Event gets both the exception, and the main one!?
    // set an "isException" flag!?
    importFromIcal(id: string, ical: string, keep = true): {id: string, event: any} {
        let component = new ICAL.Component(ICAL.parse(ical));
        // https://github.com/mozilla-comm/ical.js/issues/455
        if (component.getFirstSubcomponent('vtimezone')) {
            for (const tzComponent of component.getAllSubcomponents('vtimezone')) {
                const tz = new ICAL.Timezone({
                    tzid:      tzComponent.getFirstPropertyValue('tzid'),
                    component: tzComponent,
                });

                if (!ICAL.TimezoneService.has(tz.tzid)) {
                    ICAL.TimezoneService.register(tz.tzid, tz);
                }
            }
        }
        component = ICAL.helpers.updateTimezones(component);
        // Skip exceptions, ICAL.Event will add them as related items.
        // Assuming this is one event, this should return one item
        // with all the related ones attached to it(!)
        // NB: Some ics has recurrence-id on *every* VEVENT, how prevalent
        // is that? - this code will fail on those..
        // keep = strict checking (not just for overview) and store
        const vevents = component.getAllSubcomponents('vevent')
            .filter((c) => !c.hasProperty('recurrence-id'))
            .map((c) => new ICAL.Event(c, {'strictExceptions': keep}));

        // If this is empty, likely because an exception got separated
        // from its rrule at some point - check to see if we already
        // have the same uid
        if (vevents.length === 0) {
            const ievent = new ICAL.Event(component.getFirstSubcomponent('vevent'));
            const existingEvent = this.icalevents.find(
                (entry) => entry['id'] === ievent.uid
            );
            // Lets hope we get these in order (rrule first, exception after)
            if (existingEvent && ievent.isRecurrenceException()) {
                existingEvent['event'].relateException(ievent);
                // we could save modified event, and delete this one
                // or keep doing this and leave that for a different fix?
            }
            return;
        }
        if (keep) {
            this.icalevents.push({ 'id': id, 'event': vevents[0] });
        }

        return { 'id': id, 'event': vevents[0] };
    }

    // generate RBE events from ICAL.Events (inc exceptions)
    // default to "now", plus 1mo, and "events stored by fromIcal previously
    // iterator will quite happily generate events before the ICAL startdate
    // if you ask it to!

    generateEvents(startDate?: Date, endDate?: Date, ical_events?: { id: string, event: ICAL.Event}[]): RunboxCalendarEvent[] {

        // end does not default! recurs forever unless stopped
        // set below if not a COUNT item
        let end_date_Moment = endDate
            ? moment(endDate)
            : undefined;

        const event_list = ical_events ? ical_events : this.icalevents;

        // Get the instances (one per date):
        // ICAL.RecurExpansion iterator
        const events: RunboxCalendarEvent[] = [];
        event_list.forEach((ievent) => {
            const id = ievent['id'];
            let icalevent = ievent['event'];

            if (!icalevent.isRecurring()) {
                if (!startDate ||
                    (moment(startDate).isSameOrBefore(icalevent.endDate.toJSDate())
                        && moment(endDate).isSameOrAfter(icalevent.startDate.toJSDate()) )) {
                    events.push(new RunboxCalendarEvent(id, icalevent, icalevent.startDate, icalevent.endDate, this.me.timezone));
                }
                return;
            }
            // start defaults to event dtstart if undefined
            // don't start before the event itself starts
            // (after end is checked below)
            const start_date_ICAL = startDate && moment(startDate).isSameOrAfter(icalevent.startDate.toJSDate())
                ? ICAL.Time.fromJSDate(startDate) : undefined;

            // in case we just got passed a generic date:
            if (start_date_ICAL) {
                start_date_ICAL.isDate = icalevent.startDate.isDate;
            }

            // improve RRULEs if underspecified (then save!?)
            icalevent = this.fixICALEvent(icalevent);

            // Now recheck the start_date_ICAL against the known
            // start/end/until dates
            // And actually generate some events!
            let next_time;
            let iterator = icalevent.iterator(start_date_ICAL);
            if (iterator.ruleIterators[0].rule.isByCount()
                && icalevent.component.parent.hasProperty('X-RUNBOX-CALCULATED-DTEND')) {
                const calc_end_date = ICAL.Time.fromString(icalevent.component.parent
                    .getFirstPropertyValue('X-RUNBOX-CALCULATED-DTEND')).toJSDate();
                if (startDate && moment(startDate).isAfter(calc_end_date)) {
                    // console.log('Skipping generation as already ended');
                    return;
                }
                // on COUNT, generate all
                iterator = icalevent.iterator();
            } else if (!end_date_Moment) {
                end_date_Moment =  moment().startOf('month').add(2, 'month');
            }
            // keep going until we pass the end date:
            while ( ( next_time = iterator.next() )
                && (end_date_Moment ? end_date_Moment.isAfter(next_time.toJSDate()) : true) ) {
                const details = icalevent.getOccurrenceDetails(next_time);
                events.push(
                    new RunboxCalendarEvent(id, details.item, details.startDate, details.endDate, this.me.timezone));
            }
        });
        return events;
    }

    modifyCalendar(calendar: RunboxCalendar) {
        this.activities.begin(Activity.EditingCalendar);
        this.rmmapi.modifyCalendar(calendar).subscribe(() => {
            console.log('Calendar edited:', calendar['id']);
            const idx = this.calendars.findIndex(c => c.id === calendar['id']);
            this.calendars.splice(idx, 1, calendar);
            this.calendarSubject.next(this.calendars);
            this.activities.end(Activity.EditingCalendar);
        }, e => {
            this.apiErrorHandler(e);
            this.activities.end(Activity.EditingCalendar);
        });
    }

    modifyEvent(event: RunboxCalendarEvent) {
        if (event._old_id) {
            // special case: if event.calendar is being modified we can't simply update the event:
            // we need to copy it to a new calendar, and remove it from the old one.
            this.addEvent(event).then(id => {
                console.log('Event recreated as', id);
                this.deleteEvent(event._old_id);
            });
        } else {
            // simple case: just modify the event in place
            this.activities.begin(Activity.EditingEvent);
            this.rmmapi.modifyCalendarEvent(event as RunboxCalendarEvent).subscribe(_ => {
                // FIXME: ids are no longer unique!? add start time to the mix?
                const idx = this.events.findIndex(c => c.id === event.id);
                this.events.splice(idx, 1, event);
                this.eventSubject.next(this.events);
                this.activities.end(Activity.EditingEvent);
            }, e => {
                this.apiErrorHandler(e);
                this.activities.end(Activity.EditingEvent);
            });
        }
    }

    importCalendar(calendarId: string, ics: string): Observable<any> {
        return new Observable(o => {
            this.rmmapi.importCalendar(calendarId, ics).subscribe(res => {
                this.reloadEvents();
                o.next(res);
            }, e => this.apiErrorHandler(e));
        });
    }

    loadVTimezone(tzname: string) {
        this.rmmapi.getVTimezone(tzname).subscribe(tzData => {
            // This debug makes tests quite noisy!
            // console.log('Found timezone data:', tzData);
            // VCALENDAR with VTIMEZONE in it
            const component = new ICAL.Component(ICAL.parse(tzData));
            let tz;
            if (component.getFirstSubcomponent('vtimezone')) {
                for (const tzComponent of component.getAllSubcomponents('vtimezone')) {
                    // TZIDs in vzic are, eg: /citadel.org/20210210_1/Europe/London
                    // so that we match the same thing, we save the unique tz
                    // up there where userTimezoneloaded is subbed.
                    tz = new ICAL.Timezone({
                        tzid:      tzComponent.getFirstPropertyValue('tzid'),
                        component: tzComponent,
                    });
                    if (!ICAL.TimezoneService.has(tz.tzid)) {
                        ICAL.TimezoneService.register(tz.tzid, tz);
                    }
                }
            }
            this.userTimezoneLoaded.next(tz);
            this.userTimezoneLoaded.complete();
        });
    }

    reloadEvents() {
        console.log('Fetching events');
        this.activities.begin(Activity.RefreshingEvents);
        this.rmmapi.getCalendarEvents().subscribe(events => {
            this.events = [];
            this.icalevents = [];
            events.forEach((e: any) => {
                // store events into this.icalevents
                this.importFromIcal(e.id, e.ical);
            });

            // generate RBE events for just this set, for current month+1:
            // TODO: what if user runs import while not looking at "today"?
            // Returns an array of RunboxCalendarEvent objects
            const runboxevents = this.generateEvents();
            this.events = this.events.concat(runboxevents);
            this.eventSubject.next(this.events);
            this.activities.end(Activity.RefreshingEvents);
        }, e => {
            this.apiErrorHandler(e);
            this.activities.end(Activity.RefreshingEvents);
        });
    }

    removeCache() {
        this.storage.set('caldavCache', undefined);
        this.syncTokens = {};
        this.syncCaldav();
    }

    saveCache() {
        const cache = {
            version:   4,
            calendars: this.calendars,
            events:    this.icalevents.map((event) =>
                ({'id': event['id'], 'ical': event['event'].component.parent.toString() } ))
        };
        this.storage.set('caldavCache', cache);
    }

    syncCaldav(force = false) {
        if (force) {
            // clear local syncTokens to make sure that events get redownloaded
            this.syncTokens = {};
        }
        console.log('Fetching calendars');
        this.activities.begin(Activity.RefreshingCalendars);
        this.rmmapi.getCalendars().subscribe(calendars => {
            this.calendars = calendars;
            console.log('Calendars loaded:', calendars);
            this.calendarSubject.next(calendars);
            this.activities.end(Activity.RefreshingCalendars);
        }, e => {
            this.apiErrorHandler(e);
            this.activities.end(Activity.RefreshingCalendars);
        });
    }

    // check if we have enough events to show another month worth
    // (forward and back), generate if not
    updateEventList(viewPeriod?: ViewPeriod) {
        this.activities.begin(Activity.GeneratingEvents);
        let this_month, start, end_month, next_month: moment.Moment;
        // Too much is better than not enough!
        if (viewPeriod) {
            this_month = moment(viewPeriod.start).startOf('month');
        } else {
            this_month  = moment().startOf('month');
        }
        // generate now(viewdate) +/- 1 month (max display size)
        start       = this_month.clone(); start.subtract(1, 'month');
        end_month   = this_month.clone(); end_month.add(1, 'month');
        next_month  = this_month.clone(); next_month.add(3, 'month');

        // Could try and be clever and generate only last month / next month
        // assuming some previous code did current one, but.. how to only insert
        // those new ones into this.events?
        // lets just try/do all for now
        // we wont interrupt the page redraw process though.

        // NB calendar-app.component.spec.ts relis on this being
        // multiple months
        if (this.icalevents.length > 0) {
            this.events = this.generateEvents(start.toDate(), next_month.toDate(), this.icalevents);
            this.eventSubject.next(this.events);
        }

        this.activities.end(Activity.GeneratingEvents);
    }

}
