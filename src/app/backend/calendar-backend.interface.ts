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

import { Observable } from 'rxjs';
import { InjectionToken } from '@angular/core';

/**
 * Represents a calendar
 */
export interface Calendar {
    id: string;
    name: string;
    color?: string;
    syncToken?: string;
    isVisible?: boolean;
    isDefault?: boolean;
}

/**
 * Represents a calendar event (raw iCal format)
 */
export interface CalendarEventRaw {
    id: string;
    calendarId: string;
    ical: string;
}

/**
 * Represents a calendar event (parsed)
 */
export interface CalendarEvent {
    id: string;
    calendarId: string;
    title: string;
    description?: string;
    location?: string;
    start: Date;
    end: Date;
    allDay: boolean;
    recurrenceRule?: string;
    attendees?: { email: string; name?: string; status?: string }[];
    organizer?: { email: string; name?: string };
    ical?: string;
}

/**
 * Abstract calendar backend interface.
 * Implementations: RunboxCalendarBackend, JmapCalendarBackend
 */
export interface CalendarBackend {
    /**
     * Get all calendars
     */
    getCalendars(): Observable<Calendar[]>;

    /**
     * Add a new calendar
     */
    addCalendar(calendar: Calendar): Observable<string>;

    /**
     * Modify a calendar
     */
    modifyCalendar(calendar: Calendar): Observable<void>;

    /**
     * Delete a calendar
     */
    deleteCalendar(id: string): Observable<void>;

    /**
     * Get all events (raw iCal format)
     */
    getEventsRaw(): Observable<CalendarEventRaw[]>;

    /**
     * Add a new event
     */
    addEvent(event: CalendarEvent): Observable<string>;

    /**
     * Modify an event
     */
    modifyEvent(event: CalendarEvent): Observable<void>;

    /**
     * Delete an event
     */
    deleteEvent(id: string): Observable<void>;

    /**
     * Import events from iCal data
     */
    importCalendar(calendarId: string, ical: string): Observable<{ imported: number }>;

    /**
     * Get VTimezone definition for a timezone name
     */
    getVTimezone(tzname: string): Observable<string>;
}

export const CALENDAR_BACKEND = new InjectionToken<CalendarBackend>('CalendarBackend');
