// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2024 Runbox Solutions AS (runbox.com).
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

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import moment from 'moment';
import ICAL from 'ical.js';

import {
    CalendarBackend,
    Calendar,
    CalendarEvent,
    CalendarEventRaw
} from '../calendar-backend.interface';
import { RunboxWebmailAPI } from '../../rmmapi/rbwebmail';
import { RunboxCalendar } from '../../calendar-app/runbox-calendar';
import { RunboxCalendarEvent } from '../../calendar-app/runbox-calendar-event';

/**
 * Runbox implementation of CalendarBackend.
 * Wraps the existing RunboxWebmailAPI calendar methods.
 */
@Injectable({
    providedIn: 'root'
})
export class RunboxCalendarBackend implements CalendarBackend {
    constructor(private api: RunboxWebmailAPI) {}

    getCalendars(): Observable<Calendar[]> {
        return this.api.getCalendars().pipe(
            map((calendars: RunboxCalendar[]) =>
                calendars.map(c => this.runboxCalendarToCalendar(c))
            )
        );
    }

    addCalendar(calendar: Calendar): Observable<string> {
        const runboxCalendar = this.calendarToRunboxCalendar(calendar);
        // Generate ID if not provided (Runbox generates IDs client-side from name)
        if (!runboxCalendar.id) {
            runboxCalendar.generateID();
        }
        return this.api.addCalendar(runboxCalendar).pipe(
            map(() => runboxCalendar.id)
        );
    }

    modifyCalendar(calendar: Calendar): Observable<void> {
        const runboxCalendar = this.calendarToRunboxCalendar(calendar);
        return this.api.modifyCalendar(runboxCalendar).pipe(
            map(() => undefined)
        );
    }

    deleteCalendar(id: string): Observable<void> {
        return this.api.deleteCalendar(id).pipe(
            map(() => undefined)
        );
    }

    getEventsRaw(): Observable<CalendarEventRaw[]> {
        return this.api.getCalendarEvents().pipe(
            map((events: { id: string; calendar: string; ical: string }[]) =>
                events.map(e => ({
                    id: e.id,
                    calendarId: e.calendar,
                    ical: e.ical
                }))
            )
        );
    }

    addEvent(event: CalendarEvent): Observable<string> {
        const runboxEvent = this.calendarEventToRunboxEvent(event);
        return this.api.addCalendarEvent(runboxEvent).pipe(
            map(result => result.id)
        );
    }

    modifyEvent(event: CalendarEvent): Observable<void> {
        const runboxEvent = this.calendarEventToRunboxEvent(event);
        return this.api.modifyCalendarEvent(runboxEvent).pipe(
            map(() => undefined)
        );
    }

    deleteEvent(id: string): Observable<void> {
        return this.api.deleteCalendarEvent(id).pipe(
            map(() => undefined)
        );
    }

    importCalendar(calendarId: string, ical: string): Observable<{ imported: number }> {
        return this.api.importCalendar(calendarId, ical).pipe(
            map(result => ({ imported: result.imported || 0 }))
        );
    }

    getVTimezone(tzname: string): Observable<string> {
        return this.api.getVTimezone(tzname);
    }

    // Helper methods for data conversion

    private runboxCalendarToCalendar(calendar: RunboxCalendar): Calendar {
        return {
            id: calendar.id,
            name: calendar.displayname || calendar.id,
            color: calendar.color,
            syncToken: calendar.syncToken,
            isVisible: calendar.shown,
            isDefault: false
        };
    }

    private calendarToRunboxCalendar(calendar: Calendar): RunboxCalendar {
        return new RunboxCalendar({
            id: calendar.id,
            displayname: calendar.name,
            color: calendar.color,
            syncToken: calendar.syncToken
        });
    }

    private calendarEventToRunboxEvent(event: CalendarEvent): RunboxCalendarEvent {
        // If ical is provided, parse it and use the full event data
        // This preserves recurrence rules, timezones, attendees, etc.
        if (event.ical) {
            const component = new ICAL.Component(ICAL.parse(event.ical));
            const vevent = component.getFirstSubcomponent('vevent');
            if (vevent) {
                const icalevent = new ICAL.Event(vevent);
                const runboxEvent = new RunboxCalendarEvent(
                    event.id,
                    icalevent,
                    icalevent.startDate,
                    icalevent.endDate
                );
                runboxEvent.calendar = event.calendarId;
                return runboxEvent;
            }
        }

        // Fallback: create a basic event from the parsed fields
        // Note: This loses recurrence, timezone, and attendee information
        const runboxEvent = RunboxCalendarEvent.newEmpty();

        runboxEvent.id = event.id;
        runboxEvent.calendar = event.calendarId;
        runboxEvent.title = event.title;
        runboxEvent.description = event.description || '';
        runboxEvent.location = event.location || '';

        // Set dates using moment
        if (event.start) {
            runboxEvent.dtstart = moment(event.start);
            if (event.end) {
                runboxEvent.dtend = moment(event.end);
            }
        }

        runboxEvent.allDay = event.allDay;

        return runboxEvent;
    }
}
