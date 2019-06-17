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

import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, ReplaySubject } from 'rxjs';

@Injectable()
export class CalendarService {
    // cache, would be nice to have it offline
    calendars: RunboxCalendar[]   = [];
    events: RunboxCalendarEvent[] = [];

    calendarSubject = new ReplaySubject<RunboxCalendar[]>(1);
    eventSubject    = new ReplaySubject<RunboxCalendarEvent[]>(1);
    errorLog        = new Subject<HttpErrorResponse>();

    constructor(
        private rmmapi:   RunboxWebmailAPI,
    ) {
        console.log('Fetching calendars');
        this.rmmapi.getCalendars().subscribe(calendars => {
            this.calendars = calendars;
            console.log('Calendars loaded:', calendars);
            this.calendarSubject.next(calendars);
            this.reloadEvents();
        }, e => this.apiErrorHandler(e));
    }

    addCalendar(calendar: RunboxCalendar): Promise<void> {
        return new Promise((resolve, reject) => {
            this.rmmapi.addCalendar(calendar).subscribe(() => {
                console.log('Calendar created!');
                this.calendars.push(calendar);
                this.calendarSubject.next(this.calendars);
                resolve();
            }, e => { this.apiErrorHandler(e); reject(); });
        });
    }

    addEvent(event: RunboxCalendarEvent) {
        this.rmmapi.addCalendarEvent(event).subscribe(res => {
            console.log('Event created:', res);
            event.id = res.id;
            this.events.push(event);
            this.eventSubject.next(this.events);
        }, e => this.apiErrorHandler(e));
    }

    apiErrorHandler(e: HttpErrorResponse): void {
        this.errorLog.next(e);
    }

    deleteCalendar(id: string) {
        this.rmmapi.deleteCalendar(id).subscribe(() => {
            console.log('Calendar deleted:', id);
            const idx = this.calendars.findIndex(c => c.id === id);
            this.calendars.splice(idx, 1);
            // also delete all events that came from that calendar
            // (just from the view; DAV will delete them along with the calendar)
            this.events = this.events.filter(e => e.calendar !== id);

            this.calendarSubject.next(this.calendars);
            this.eventSubject.next(this.events);
        }, e => this.apiErrorHandler(e));
    }

    deleteEvent(id: string) {
        this.rmmapi.deleteCalendarEvent(id).subscribe(res => {
            console.log('Event deleted:', res);
            const idx = this.events.findIndex(e => e.id === id);
            this.events.splice(idx, 1);
            this.eventSubject.next(this.events);
        }, e => this.apiErrorHandler(e));
    }

    modifyCalendar(calendar: RunboxCalendar) {
        this.rmmapi.modifyCalendar(calendar).subscribe(() => {
            console.log('Calendar edited:', calendar['id']);
            const idx = this.calendars.findIndex(c => c.id === calendar['id']);
            this.calendars.splice(idx, 1, calendar);
            this.calendarSubject.next(this.calendars);
        }, e => this.apiErrorHandler(e));
    }

    modifyEvent(event: RunboxCalendarEvent) {
        this.rmmapi.modifyCalendarEvent(event as RunboxCalendarEvent).subscribe(res => {
            console.log('Event updated:', res);
            const idx = this.events.findIndex(c => c.id === event.id);
            this.events.splice(idx, 1, event);
            this.eventSubject.next(this.events);
        }, e => this.apiErrorHandler(e));
    }

    importCalendar(calendarId, ics): Observable<any> {
        return new Observable(o => {
            this.rmmapi.importCalendar(calendarId, ics).subscribe(res => {
                this.reloadEvents();
                o.next(res);
            }, e => this.apiErrorHandler(e));
        });
    }

    reloadEvents() {
        console.log('Fetching events');
        this.rmmapi.getCalendarEvents().subscribe(events => {
            this.events = events.map(e => new RunboxCalendarEvent(e));
            this.eventSubject.next(this.events);
        }, e => this.apiErrorHandler(e));
    }
}
