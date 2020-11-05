// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2018 Runbox Solutions AS (runbox.com).
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

import { RunboxCalendarEvent } from './runbox-calendar-event';
import * as moment from 'moment';
import * as ICAL from 'ical.js';

describe('RunboxCalendarEvent', () => {
    it('should be possible to create a new event', () => {
        const newEvent = RunboxCalendarEvent.newEmpty();
        newEvent.dtstart = moment().date(1).hours(13).seconds(0).milliseconds(0);
        newEvent.dtend = moment().date(1).hours(14).seconds(0).milliseconds(0);
        newEvent.title = 'New Event';
        newEvent.location = 'Somewhere';

        // test things addEvent calls:
      expect(newEvent.toIcal()).toMatch(/BEGIN:VEVENT/);
    });
    it('should be possible to add/remove a recurrence rule', () => {
        const sut = new RunboxCalendarEvent(
          'testcal/testev', new ICAL.Event(new ICAL.Component(['vcalendar', [], [
                [ 'vevent', [
                    [ 'dtstart', {}, 'date',  moment().toISOString().split('T')[0] ],
                    [ 'dtend',   {}, 'date',  moment().toISOString().split('T')[0] ],
                    [ 'summary', {}, 'text',  'One-time event' ],
                ] ]
          ]])), ICAL.Time.fromJSDate(new Date()), ICAL.Time.fromJSDate(new Date()),
        );
        sut.recurringFrequency = 'WEEKLY';
        expect(sut.recurringFrequency).toBe('WEEKLY', 'recurrence seems to be set');
        expect(sut.toIcal()).toContain('RRULE:FREQ=WEEKLY', 'recurrence seems to be set');

        sut.recurringFrequency = 'MONTHLY';
        expect(sut.recurringFrequency).toBe('MONTHLY', 'recurrence seems to be set');
        expect(sut.toIcal()).toContain('RRULE:FREQ=MONTHLY', 'recurrence seems to be set');
        expect(sut.toIcal()).not.toContain('RRULE:FREQ=WEEKLY', 'old recurrence seems to be gone');

        sut.recurringFrequency = '';
        expect(sut.recurringFrequency).toBe('', 'recurrence seems to be unset');
        expect(sut.toIcal()).not.toContain('RRULE', 'recurrence seems to be unset');
    });

    it('should be possible to add a special case to a recurring event', () => {
        const todayStr = moment().toISOString().split('T')[0];
        const yesterday = moment().subtract(1, 'day');
        const sut = new RunboxCalendarEvent(
            'testcal/testev', new ICAL.Event(new ICAL.Component(['vcalendar', [], [
                [ 'vevent', [
                    [ 'dtstart', {}, 'date',  todayStr ],
                    [ 'dtend',   {}, 'date',  todayStr ],
                    [ 'summary', {}, 'text',  'Weekly event' ],
                    [ 'uid',     {}, 'text',  'unittestcase1' ],
                    [ 'rrule',   {}, 'recur', { 'freq': 'WEEKLY' } ],
                ] ]
            ]])), ICAL.Time.fromJSDate(new Date()), ICAL.Time.fromJSDate(new Date()),
        );

      const future = moment().add(1, 'week').add(3, 'day');
      // FIXME
        // const events = sut.recurrences(yesterday.toDate(), future.toDate());

        // expect(events.length).toBe(2);
        // expect(events[0].dtstart.isSame(events[1].dtstart)).toBe(false);

        // alter the one happening next week
        // const copy = events[1].clone();
        // copy.title = 'Next weekly occurrence';
        // sut.addRecurrenceSpecialCase(copy);
        // console.log("Sut after setting specialcase:", sut.toIcal(), "\n");

        // events = sut.recurrences(yesterday.toDate(), future.toDate());
        // expect(events[0].title).toBe('Weekly event');
        // expect(events[1].title).toBe('Next weekly event');
    });
});
