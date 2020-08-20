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
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { StorageService } from '../storage.service';
import { BackgroundActivityService } from '../common/background-activity.service';

import { Injectable, OnDestroy } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, ReplaySubject } from 'rxjs';

import * as moment from 'moment';

enum Activity {
    LoadingCache        = 'Loading local cache',
    CreatingCalendar    = 'Creating calendar',
    CreatingEvent       = 'Creating event',
    DeletingCalendar    = 'Deleting calendar',
    DeletingEvent       = 'Deleting event',
    EditingCalendar     = 'Editing calendar',
    EditingEvent        = 'Editing event',
    RefreshingCalendars = 'Refreshing calendars',
    RefreshingEvents    = 'Refreshing events',
}

@Injectable()
export class CalendarService implements OnDestroy {
    calendars:    RunboxCalendar[]      = [];
    events:       RunboxCalendarEvent[] = [];

    syncTokens = {};
    syncInterval: any;
    syncIntervalSeconds = 15;
    lastUpdate: moment.Moment;

    calendarSubject = new ReplaySubject<RunboxCalendar[]>(1);
    eventSubject    = new ReplaySubject<RunboxCalendarEvent[]>(1);
    errorLog        = new Subject<HttpErrorResponse>();

    activities = new BackgroundActivityService<Activity>();

    constructor(
        private rmmapi:  RunboxWebmailAPI,
        private storage: StorageService,
    ) {
        storage.get('caldavCache').then(cache => {
            if (!cache) {
                return;
            }
            console.log('Cache version:', cache['version']);
            // tslint:disable-next-line:triple-equals
            if (cache['version'] != 3) {
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
            this.calendarSubject.next(this.calendars);
            this.events = cache['events'].map((e: any) => new RunboxCalendarEvent(e.id, e.jcal));
            this.eventSubject.next(this.events);
            this.activities.end(Activity.LoadingCache);
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
        this.syncCaldav();
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
        const existing = this.events.find(c => c.id === event.id);
        if (existing.calendar !== event.calendar) {
            // special case: if event.calendar is being modified we can't simply update the event:
            // we need to copy it to a new calendar, and remove it from the old one.
            event.id = null; // this will make it a "new" event
            this.addEvent(event).then(id => {
                console.log('Event recreated as', id);
                this.deleteEvent(existing.id);
            });
        } else {
            // simple case: just modify the event in place
            this.activities.begin(Activity.EditingEvent);
            this.rmmapi.modifyCalendarEvent(event as RunboxCalendarEvent).subscribe(_ => {
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

    reloadEvents() {
        console.log('Fetching events');
        this.activities.begin(Activity.RefreshingEvents);
        this.rmmapi.getCalendarEvents().subscribe(events => {
            this.events = events.map((e: any) => RunboxCalendarEvent.fromIcal(e.id, e.ical));
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
            version:   3,
            calendars: this.calendars,
            events:    this.events,
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
}
