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

import { RunboxCalendarEvent, RecurSaveType } from './runbox-calendar-event';
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
    it('should be possible to add/edit/remove a WEEKLY recurrence rule', () => {
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

        sut.recurs = false;
        expect(sut.recurringFrequency).toBe('', 'recurrence seems to be unset');
        expect(sut.toIcal()).not.toContain('RRULE', 'recurrence seems to be unset');
    });

    it('should be possible to recur every other week on multiple days of the week', () => {
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
        sut.recurInterval = 2;
        sut.recursByDay = ['SA', 'SU'];
        expect(sut.recurringFrequency).toBe('WEEKLY', 'recurrence can be retrieved');
        expect(sut.toIcal()).toContain('RRULE:FREQ=WEEKLY', 'recurrence seems to be stringified properly');
        expect(sut.toIcal()).toContain('INTERVAL=2', 'ical has interval set');
        expect(sut.toIcal()).toContain('BYDAY=SA,SU', 'ical has BYDAY params');
    });

    it('should be possible to recur monthly on one or more Xth of the month', () => {
        const sut = new RunboxCalendarEvent(
          'testcal/testev', new ICAL.Event(new ICAL.Component(['vcalendar', [], [
                [ 'vevent', [
                    [ 'dtstart', {}, 'date',  moment().toISOString().split('T')[0] ],
                    [ 'dtend',   {}, 'date',  moment().toISOString().split('T')[0] ],
                    [ 'summary', {}, 'text',  'One-time event' ],
                ] ]
          ]])), ICAL.Time.fromJSDate(new Date()), ICAL.Time.fromJSDate(new Date()),
        );
        sut.recurringFrequency = 'MONTHLY';
        sut.recurInterval = 1; // the default
        sut.recursByMonthDay = ['5'];
        expect(sut.recurringFrequency).toBe('MONTHLY', 'recurrence can be retrieved');
        expect(sut.toIcal()).toContain('RRULE:FREQ=MONTHLY', 'recurrence seems to be stringified properly');
        expect(sut.toIcal()).not.toContain('INTERVAL', 'ical interval not set if default value (1)');
        expect(sut.toIcal()).toContain('BYMONTHDAY=5', 'ical has BYMONTHDAY params');
        sut.recursByMonthDay = ['5', '6'];
        expect(sut.toIcal()).toContain('BYMONTHDAY=5,6', 'ical has updated BYMONTHDAY params');

    });

    it('should be possible to recur monthly on Xth day of the month', () => {
        const sut = new RunboxCalendarEvent(
          'testcal/testev', new ICAL.Event(new ICAL.Component(['vcalendar', [], [
                [ 'vevent', [
                    [ 'dtstart', {}, 'date',  moment().toISOString().split('T')[0] ],
                    [ 'dtend',   {}, 'date',  moment().toISOString().split('T')[0] ],
                    [ 'summary', {}, 'text',  'One-time event' ],
                ] ]
          ]])), ICAL.Time.fromJSDate(new Date()), ICAL.Time.fromJSDate(new Date()),
        );
        // Every 2nd Monday of every month
        sut.recurringFrequency = 'MONTHLY';
        sut.recurInterval = 1; // the default
        sut.recursByMonthDay = ['2'];
        sut.recursByDay = ['MO'];
        expect(sut.recurringFrequency).toBe('MONTHLY', 'recurrence can be retrieved');
        expect(sut.toIcal()).toContain('RRULE:FREQ=MONTHLY', 'recurrence seems to be stringified properly');
        expect(sut.toIcal()).not.toContain('INTERVAL', 'ical interval not set if default value (1)');
        expect(sut.toIcal()).toContain('BYMONTHDAY=2', 'ical has BYMONTHDAY params');
        expect(sut.toIcal()).toContain('BYDAY=MO', 'ical has BYDAY params');
    });

    it('should be possible to recur yearly on Xth day of the month', () => {
        const sut = new RunboxCalendarEvent(
          'testcal/testev', new ICAL.Event(new ICAL.Component(['vcalendar', [], [
                [ 'vevent', [
                    [ 'dtstart', {}, 'date',  moment().toISOString().split('T')[0] ],
                    [ 'dtend',   {}, 'date',  moment().toISOString().split('T')[0] ],
                    [ 'summary', {}, 'text',  'One-time event' ],
                ] ]
          ]])), ICAL.Time.fromJSDate(new Date()), ICAL.Time.fromJSDate(new Date()),
        );
        // Every 2nd of February of every year
        sut.recurringFrequency = 'YEARLY';
        sut.recurInterval = 1; // the default
        sut.recursByMonth = ['2'];
        sut.recursByMonthDay = ['2'];
        expect(sut.recurringFrequency).toBe('YEARLY', 'recurrence can be retrieved');
        expect(sut.toIcal()).toContain('RRULE:FREQ=YEARLY', 'recurrence seems to be stringified properly');
        expect(sut.toIcal()).not.toContain('INTERVAL', 'ical interval not set if default value (1)');
        expect(sut.toIcal()).toContain('BYMONTHDAY=2', 'ical has BYMONTHDAY params');
        expect(sut.toIcal()).toContain('BYMONTH=2', 'ical has BYMONTH params');
    });

    it('should be possible to add a special case to a recurring event', () => {
        const sut = new RunboxCalendarEvent(
            'testcal/testev', new ICAL.Event(new ICAL.Component([
                'vevent', [
                  [ 'dtstart', {}, 'date',  '2021-01-25' ],
                    [ 'dtend',   {}, 'date',  '2021-01-25' ],
                    [ 'summary', {}, 'text',  'Weekly event' ],
                    [ 'uid',     {}, 'text',  'unittestcase1' ],
                    [ 'rrule',   {}, 'recur', { 'freq': 'WEEKLY' } ],
                ]
            ])), ICAL.Time.fromDateString('2021-02-01'), ICAL.Time.fromDateString('2021-02-01'),
        );

        const future = moment('2021-01-25').add(1, 'week').add(3, 'day');
        // Feb 4th
        sut.updateEvent(
            future,
            future,
            sut.calendar,
            RecurSaveType.THIS_ONLY,
            'Moved weekly event', undefined, undefined,
            true,
            sut.recurringFrequency,
            sut.recurInterval,
            undefined, undefined, undefined, // and optional params..
        );

        expect(sut.toIcal()).toContain('SUMMARY:Moved weekly event');
        expect(sut.toIcal()).toContain('RECURRENCE-ID;VALUE=DATE:20210201');
        expect(sut.toIcal()).toContain('DTSTART;VALUE=DATE:20210204');
    });

    it('should be possible to add a special case to a recurring event (with time)', () => {
        const sut = new RunboxCalendarEvent(
            'testcal/unittestcase2', new ICAL.Event(new ICAL.Component([
                'vevent', [
                  [ 'dtstart', {}, 'date',  '2021-01-25T09:00:00' ],
                  [ 'dtend',   {}, 'date',  '2021-01-25T10:00:00' ],
                  [ 'summary', {}, 'text',  'Weekly event' ],
                  [ 'uid',     {}, 'text',  'unittestcase2' ],
                  [ 'rrule',   {}, 'recur', { 'freq': 'WEEKLY' } ],
                ]
            ])), ICAL.Time.fromDateTimeString('2021-02-01T09:00:00'), ICAL.Time.fromDateTimeString('2021-02-01T10:00:00'),
        );
        // Move this one an hour later
        const future = moment('2021-02-01T10:00:00');
        sut.updateEvent(
            future,
            future,
            sut.calendar,
            RecurSaveType.THIS_ONLY,
            'Moved weekly event one hour', undefined, undefined,
            true,
            sut.recurringFrequency,
            sut.recurInterval,
            undefined, undefined, undefined, // and optional params..
        );

        expect(sut.toIcal()).toContain('SUMMARY:Moved weekly event one hour');
        expect(sut.toIcal()).toContain('RECURRENCE-ID:20210201T090000');
        expect(sut.toIcal()).toContain('DTSTART:20210201T100000');
    });

    it('should be possible to add a special case to a recurring event (with timezone)', () => {
         // mostly taken straight out of the jCal spec: https://tools.ietf.org/html/rfc7265#page-30
        const jcal = ICAL.parse(
`BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VTIMEZONE
TZID:Europe/London
BEGIN:DAYLIGHT
TZOFFSETFROM:+0000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
DTSTART:19810329T010000
TZNAME:BST
TZOFFSETTO:+0100
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0100
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
DTSTART:19961027T020000
TZNAME:GMT
TZOFFSETTO:+0000
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
DTEND;TZID=Europe/London:20201101T100000
UID:unittestcase3
DTSTAMP:20201012T113203Z
SUMMARY:Daily recurring
DTSTART;TZID=Europe/London:20201101T090000
RRULE:FREQ=DAILY;INTERVAL=1;COUNT=5
END:VEVENT
END:VCALENDAR`
        );
         const ical = new ICAL.Component(jcal);
         // Need to setup timezones (usually calendar.service does this)
         if (ical.getFirstSubcomponent('vtimezone')) {
             for (const tzComponent of ical.getAllSubcomponents('vtimezone')) {
                 const tz = new ICAL.Timezone({
                     tzid:      tzComponent.getFirstPropertyValue('tzid'),
                     component: tzComponent,
                 });

                 if (!ICAL.TimezoneService.has(tz.tzid)) {
                     ICAL.TimezoneService.register(tz.tzid, tz);
                 }
             }
         }
         const vevent = ical.getFirstSubcomponent('vevent');
         // pass in prop to apply the correct timezone to the ICAL.Time object
         const dtstartProp = vevent.getFirstProperty('dtstart');

         // This is the RCE instance for the 2nd day:
         const sut = new RunboxCalendarEvent(
             'testcal/unittestcase3',
             new ICAL.Event(vevent),
             ICAL.Time.fromDateTimeString('2006-01-03T12:00:00', dtstartProp),
             undefined, // defined by duration instead
         );
         // Move this one an hour later
         const future = moment('2006-01-03T13:00:00');
         sut.updateEvent(
             future,
             undefined,
             sut.calendar,
             RecurSaveType.THIS_ONLY,
             'Moved daily event one hour', undefined, undefined,
             true,
             sut.recurringFrequency,
             sut.recurInterval,
             undefined, undefined, undefined, // and optional params..
         );

         expect(sut.toIcal()).toContain('SUMMARY:Moved daily event one hour');
         expect(sut.toIcal()).toContain('RECURRENCE-ID;TZID=Europe/London:20060103T120000');
         expect(sut.toIcal()).toContain('DTSTART;TZID=Europe/London:20060103T130000');
     });
});
