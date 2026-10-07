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
import moment from 'moment';
import ICAL from 'ical.js';

describe('RunboxCalendarEvent', () => {
    beforeEach(() => {
       ICAL.TimezoneService.reset();
    });

    // Register a minimal VTIMEZONE with ICAL.TimezoneService for test scenarios
    function ensureTimezone(tzid: string, standardOffset: string, daylightOffset: string) {
        if (ICAL.TimezoneService.has(tzid)) {
            return;
        }
        const vtimezone = [
            'BEGIN:VTIMEZONE',
            'TZID:' + tzid,
            'BEGIN:STANDARD',
            'DTSTART:19700101T000000',
            'TZOFFSETTO:' + standardOffset,
            'TZOFFSETFROM:' + daylightOffset,
            'END:STANDARD',
            'BEGIN:DAYLIGHT',
            'DTSTART:19700329T020000',
            'TZOFFSETTO:' + daylightOffset,
            'TZOFFSETFROM:' + standardOffset,
            'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
            'END:DAYLIGHT',
            'END:VTIMEZONE',
        ].join('\r\n');
        const parsed = ICAL.parse('BEGIN:VCALENDAR\r\n' + vtimezone + '\r\nEND:VCALENDAR');
        const comp = new ICAL.Component(parsed);
        const tzComp = comp.getFirstSubcomponent('vtimezone');
        const tz = new ICAL.Timezone({
            tzid: tzComp.getFirstPropertyValue('tzid'),
            component: tzComp,
        });
        ICAL.TimezoneService.register(tz.tzid, tz);
    }

    it('should be possible to create a new event', () => {
        const newEvent = RunboxCalendarEvent.newEmpty();
        newEvent.dtstart = moment().date(1).hours(13).seconds(0).milliseconds(0);
        newEvent.dtend = moment().date(1).hours(14).seconds(0).milliseconds(0);
        newEvent.title = 'New Event';
        newEvent.location = 'Somewhere';

        // test things addEvent calls:
        expect(newEvent.toIcal()).toMatch(/BEGIN:VEVENT/);
    });
    it('should expose readable text for entity-encoded HTML descriptions', () => {
        const ical = new ICAL.Component(['vcalendar', [], [
            [ 'vevent', [
                [ 'dtstart', {}, 'date', '2021-05-15' ],
                [ 'dtend',   {}, 'date', '2021-05-16' ],
                [ 'summary', {}, 'text', 'Meeting invitation' ],
                [
                    'description', {}, 'text',
                    '&lt;p&gt;Agenda &amp;amp; notes&lt;/p&gt;&lt;br&gt;Room&nbsp;4'
                ],
            ] ]
        ]]);
        const sut = new RunboxCalendarEvent(
          'testcal/testev', new ICAL.Event(ical.getFirstSubcomponent('vevent')),
          ICAL.Time.fromDateString('2021-05-15'), ICAL.Time.fromDateString('2021-05-16')
        );

        expect(sut.description).toBe('&lt;p&gt;Agenda &amp;amp; notes&lt;/p&gt;&lt;br&gt;Room&nbsp;4');
        expect(sut.displayDescription).toBe('Agenda & notes\nRoom 4');
    });
    it('should be possible to create a new event, without times', () => {
        const newEvent = RunboxCalendarEvent.newEmpty();
        newEvent.updateEvent(
            moment().date(1).hours(0).seconds(0).milliseconds(0),
            moment().date(2).hours(0).seconds(0).milliseconds(0),
            true,
            'Home',
            RecurSaveType.ALL_OCCURENCES,
            'New Event',
            'Somewhere',
          '',
          false,
          '',
          0,
          [],
          [],
          []
        );

        // test things addEvent calls:
        expect(newEvent.toIcal()).toMatch(/BEGIN:VEVENT/);
      // check date not time:
      const now = ICAL.Time.fromJSDate(moment().date(1).toDate());
      expect(newEvent.toIcal()).not.toContain(now.toICALString());
      now.isDate = true;
      expect(newEvent.toIcal()).toContain(now.toICALString());
    });
    it('should be possible to add/edit/remove a WEEKLY recurrence rule', () => {
        const sut = new RunboxCalendarEvent(
          'testcal/testev', new ICAL.Event(new ICAL.Component(['vcalendar', [], [
                [ 'vevent', [
                    [ 'dtstart', {}, 'date',  moment().toISOString().split('T')[0] ],
                    [ 'dtend',   {}, 'date',  moment().toISOString().split('T')[0] ],
                    [ 'summary', {}, 'text',  'One-time event' ],
                ] ]
          ]])), ICAL.Time.fromJSDate(new Date()), ICAL.Time.fromJSDate(new Date())
          , 'Europe/London' // user's timezone for display
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
          'Europe/London' // user's timezone for display
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
          ]])), ICAL.Time.fromJSDate(new Date()), ICAL.Time.fromJSDate(new Date())
          , 'Europe/London' // user's timezone for display
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
          'Europe/London' // user's timezone for display
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
          'Europe/London' // user's timezone for display
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
          'Europe/London' // user's timezone for display
        );

        const future = moment('2021-01-25').add(1, 'week').add(3, 'day');
        // Feb 4th
        sut.updateEvent(
            future,
            future,
            false,
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
          'Europe/London' // user's timezone for display
        );
        // Move this one an hour later
        const future = moment('2021-02-01T10:00:00');
        sut.updateEvent(
            future,
            future,
            false,
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
CALSCALE:GREGORIAN
PRODID:-//Ximian//NONSGML Evolution Calendar//EN
VERSION:2.0
BEGIN:VTIMEZONE
TZID:/freeassociation.sourceforge.net/Europe/Berlin
X-LIC-LOCATION:Europe/Berlin
BEGIN:DAYLIGHT
TZNAME:CEST
DTSTART:19800404T020000
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
RRULE:FREQ=YEARLY;UNTIL=19800406T010000Z;BYDAY=1SU;BYMONTH=4
END:DAYLIGHT
BEGIN:STANDARD
TZNAME:CET
DTSTART:19800926T030000
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
RRULE:FREQ=YEARLY;UNTIL=19950924T010000Z;BYDAY=-1SU;BYMONTH=9
END:STANDARD
BEGIN:DAYLIGHT
TZNAME:CEST
DTSTART:19810328T020000
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3
END:DAYLIGHT
BEGIN:STANDARD
TZNAME:CET
DTSTART:19961031T030000
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10
END:STANDARD
END:VTIMEZONE
BEGIN:VTIMEZONE
TZID:/citadel.org/20210210_1/America/New_York
LAST-MODIFIED:20210210T123706Z
X-LIC-LOCATION:America/New_York
X-PROLEPTIC-TZNAME:LMT
BEGIN:DAYLIGHT
TZNAME:EDT
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
DTSTART:20070311T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
END:DAYLIGHT
BEGIN:STANDARD
TZNAME:EST
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
DTSTART:20071104T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
UID:d26dc8b107af7c7ca9fb4c239085c9e19c4677fc
DTSTAMP:20201116T115037Z
DTSTART;TZID=/freeassociation.sourceforge.net/Europe/Berlin:
 20210514T090000
DTEND;TZID=/freeassociation.sourceforge.net/Europe/Berlin:
 20210514T100000
SEQUENCE:2
SUMMARY:Test: Berlin at 9am
RRULE:FREQ=DAILY;INTERVAL=1;COUNT=5
TRANSP:OPAQUE
CLASS:PUBLIC
CREATED:20210511T111559Z
LAST-MODIFIED:20210511T111559Z
END:VEVENT
END:VCALENDAR`
        );
         const ical = new ICAL.Component(jcal);
         // Need to setup timezones (usually calendar.service does this)
         if (ical.getFirstSubcomponent('vtimezone')) {
             for (const tzComponent of ical.getAllSubcomponents('vtimezone')) {
                 const tz = new ICAL.Timezone({
                   tzid: tzComponent.getFirstPropertyValue('tzid'),
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
             ICAL.Time.fromDateTimeString('2021-05-15T09:00:00', dtstartProp),
             undefined, // defined by duration instead
             // calendar.service replaces "America/New_York" with the unique one
             '/citadel.org/20210210_1/America/New_York' // user's timezone for display
         );
      console.log('sut tz :' + sut.timezone);
      // verify timezone event has sane start/end dates
      // This should be in the user's tz (Europe/London in this test)
      console.log('event start :' + sut.start.toISOString());
      // 3am New York
      // 09:00 Berlin CEST → 03:00 New York EDT (account timezone)
      // getHours() is deterministic with component construction
      expect(sut.start.getHours()).toBe(3, 'start hour is 3 (09:00 Berlin in New York tz)');
      expect(sut.start.getDate()).toBe(15, 'start day is 15th');
      // Move this one an hour later
      // TZ?
      const future = moment('2021-05-15T04:00:00');
      const future_end = moment('2021-05-15T05:00:00');
         sut.updateEvent(
             future,
             future_end,
             false,
             sut.calendar,
             RecurSaveType.THIS_ONLY,
             'Moved daily event one hour', undefined, undefined,
             true,
             sut.recurringFrequency,
             sut.recurInterval,
             undefined, undefined, undefined, // and optional params..
         );

      expect(sut.toIcal()).toContain('SUMMARY:Moved daily event one hour');
      // Length of line causes a newline, see RFC sec 3.1
      expect(sut.toIcal()).toContain('RECURRENCE-ID;TZID=/freeassociation.sourceforge.net/Europe/Berlin:20210515T\r\n 090000');
      expect(sut.toIcal()).toContain('DTSTART;TZID=/freeassociation.sourceforge.net/Europe/Berlin:20210515T100000');
     });

    it('should return correct end time for a timed event with timezone', () => {
        // Use UTC times + UTC timezone to avoid needing VTIMEZONE registration.
        // The getter's timezone conversion is tested by other tests; this one
        // verifies the 1-second subtraction (ICAL exclusive → inclusive).
        const sut = new RunboxCalendarEvent(
            'testcal/testev', new ICAL.Event(new ICAL.Component([
                'vevent', [
                    [ 'dtstart', {}, 'date',  '2021-05-15T09:00:00Z' ],
                    [ 'dtend',   {}, 'date',  '2021-05-15T10:30:00Z' ],
                    [ 'summary', {}, 'text',  'Timed event' ],
                ]
            ])),
            ICAL.Time.fromDateTimeString('2021-05-15T09:00:00Z'),
            ICAL.Time.fromDateTimeString('2021-05-15T10:30:00Z'),
            'UTC'
        );

        // end subtracts 1 second (ICAL exclusive → angular-calendar inclusive)
        // 10:30:00 - 1 second = 10:29:59
        expect(sut.end.getHours()).toBe(10, 'end hour');
        expect(sut.end.getMinutes()).toBe(29, 'end minutes');
        expect(sut.end.getSeconds()).toBe(59, 'end seconds');
    });

    it('should return correct end day for an all-day event', () => {
        const sut = new RunboxCalendarEvent(
            'testcal/testev', new ICAL.Event(new ICAL.Component([
                'vevent', [
                    [ 'dtstart', {}, 'date',  '2021-05-15' ],
                    [ 'dtend',   {}, 'date',  '2021-05-17' ],
                    [ 'summary', {}, 'text',  'Multi-day all-day' ],
                ]
            ])),
            ICAL.Time.fromDateString('2021-05-15'),
            ICAL.Time.fromDateString('2021-05-17'),
            'Europe/London'
        );

        // DTEND is exclusive (2021-05-17), angular-calendar expects inclusive
        // So displayed end should be 2021-05-16
        expect(sut.end.getDate()).toBe(16, 'end day is 16th (DTEND 17th minus 1)');
        expect(sut.end.getMonth()).toBe(4, 'end month is May (0-indexed)');
    });

    it('should preserve correct date for all-day event round-trip', () => {
        const sut = RunboxCalendarEvent.newEmpty();
        // Set up an all-day event for May 1st
        sut.updateEvent(
            moment('2021-05-01'), // user picks May 1st
            moment('2021-05-02'), // next day (DTEND exclusive for all-day)
            true,                 // allDay = true
            sut.calendar,
            RecurSaveType.ALL_OCCURENCES,
            'All-day May 1st',
            '',
            '',
            false,
            '',
            0,
            [],
            [],
            []
        );

        // The ICAL output should contain May 1st, not April 30th
        const icalOutput = sut.toIcal();
        expect(icalOutput).toContain('DTSTART;VALUE=DATE:20210501',
            'all-day event starts on May 1st, not shifted to April 30th');
    });

    it('should interpret floating time in account timezone', () => {
        ensureTimezone('Europe/London', '+0000', '+0100');
        const sut = new RunboxCalendarEvent(
            'testcal/float', new ICAL.Event(new ICAL.Component([
                'vevent', [
                    [ 'dtstart', {}, 'date',  '2021-06-15T14:00:00' ],
                    [ 'dtend',   {}, 'date',  '2021-06-15T15:00:00' ],
                    [ 'summary', {}, 'text',  'Floating time event' ],
                ]
            ])),
            ICAL.Time.fromDateTimeString('2021-06-15T14:00:00'),
            ICAL.Time.fromDateTimeString('2021-06-15T15:00:00'),
            'Europe/London'
        );

        // Floating time (no TZID) — components are taken as-is
        expect(sut.start.getHours()).toBe(14, 'floating start hour is 14');
        expect(sut.start.getMinutes()).toBe(0, 'floating start minutes is 0');
    });

    it('should display UTC event at correct hour for account timezone', () => {
        ensureTimezone('America/New_York', '-0500', '-0400');
        // Register a citadel-path version (as production uses)
        ensureTimezone('/citadel.org/20210210_1/America/New_York', '-0500', '-0400');

        const sut = new RunboxCalendarEvent(
            'testcal/utc', new ICAL.Event(new ICAL.Component([
                'vevent', [
                    [ 'dtstart', {}, 'date',  '2021-06-15T17:00:00Z' ],
                    [ 'dtend',   {}, 'date',  '2021-06-15T18:00:00Z' ],
                    [ 'summary', {}, 'text',  'UTC event' ],
                ]
            ])),
            ICAL.Time.fromDateTimeString('2021-06-15T17:00:00Z'),
            ICAL.Time.fromDateTimeString('2021-06-15T18:00:00Z'),
            '/citadel.org/20210210_1/America/New_York'
        );

        // 17:00 UTC = 13:00 EDT (UTC-4 in June)
        expect(sut.start.getHours()).toBe(13,
            '17:00 UTC displayed as 13:00 in New York (EDT)');
    });

    it('should display all-day event on correct day', () => {
        const sut = new RunboxCalendarEvent(
            'testcal/allday', new ICAL.Event(new ICAL.Component([
                'vevent', [
                    [ 'dtstart', {}, 'date',  '2021-05-15' ],
                    [ 'dtend',   {}, 'date',  '2021-05-16' ],
                    [ 'summary', {}, 'text',  'All-day event' ],
                ]
            ])),
            ICAL.Time.fromDateString('2021-05-15'),
            ICAL.Time.fromDateString('2021-05-16'),
            'Europe/London'
        );

        expect(sut.start.getDate()).toBe(15, 'all-day start day is 15th');
        expect(sut.start.getUTCHours()).toBe(12, 'noon UTC hour');
        // DTEND 16th exclusive → inclusive end = 15th
        expect(sut.end.getDate()).toBe(15, 'all-day end day is 15th (DTEND exclusive → inclusive)');
    });
});
