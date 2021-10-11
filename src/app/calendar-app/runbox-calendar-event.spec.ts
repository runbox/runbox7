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
    beforeEach(() => {
       ICAL.TimezoneService.reset();
    });

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
      expect(sut.start.toISOString()).toBe('2021-05-15T03:00:00.000Z');
      // Move this one an hour later
      // TZ?
      const future = moment('2021-05-15T04:00:00');
      const future_end = moment('2021-05-15T05:00:00');
         sut.updateEvent(
             future,
             future_end,
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
});
