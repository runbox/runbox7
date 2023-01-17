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

import { StorageService } from '../storage.service';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { CalendarService } from './calendar.service';
import { RunboxCalendarEvent } from './runbox-calendar-event';
import { of } from 'rxjs';
import { take } from 'rxjs/operators';
import moment from 'moment';
import ICAL from 'ical.js';

describe('CalendarService', () => {
    let dav_events: any;
    const timezone =
        `BEGIN:VCALENDAR
PRODID:-//citadel.org//NONSGML Citadel calendar//EN
VERSION:2.0
BEGIN:VTIMEZONE
TZID:/citadel.org/20210210_1/Europe/Stockholm
LAST-MODIFIED:20210210T123706Z
X-LIC-LOCATION:Europe/Stockholm
X-PROLEPTIC-TZNAME:LMT
BEGIN:STANDARD
TZNAME:SET
TZOFFSETFROM:+011212
TZOFFSETTO:+010014
DTSTART:18790101T000000
END:STANDARD
BEGIN:STANDARD
TZNAME:CET
TZOFFSETFROM:+010014
TZOFFSETTO:+0100
DTSTART:19000101T000000
END:STANDARD
BEGIN:DAYLIGHT
TZNAME:CEST
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
DTSTART:19160514T230000
RDATE:19800406T020000
END:DAYLIGHT
BEGIN:STANDARD
TZNAME:CET
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
DTSTART:19161001T010000
END:STANDARD
BEGIN:STANDARD
TZNAME:CET
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
DTSTART:19800928T030000
RRULE:FREQ=YEARLY;BYMONTH=9;BYDAY=-1SU;UNTIL=19950924T010000Z
END:STANDARD
BEGIN:DAYLIGHT
TZNAME:CEST
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
DTSTART:19810329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZNAME:CET
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
DTSTART:19961027T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE
END:VCALENDAR
`;

    // poor man's callcounter, as I don't have a proper rmmapi stub
    const calls = {
        modifyCalendarEvent: 0,
        addCalendarEvent:    0,
        deleteCalendarEvent: 0,
    };

    let storage: StorageService;
    let sut: CalendarService;

    const rmmapi = {
        me: of({ uid: 1, timezone: 'Europe/London' }),
        getCalendars: () => of([
            { id: 'test',  displayname: 'Test',  syncToken: 'asdf' },
            { id: 'test2', displayname: 'Test2', syncToken: 'ogon' }
        ]),
        getCalendarEvents: () => of(Object.values(dav_events)),
        getVTimezone:      (tzname: string) => of(timezone),
        modifyCalendarEvent: (e: RunboxCalendarEvent) => {
            calls.modifyCalendarEvent++;
            dav_events[e.id] = {'calendar': e._calendar, 'id': e.id, 'ical': e.toIcal()};
            return of(e);
        },
        addCalendarEvent: (e: RunboxCalendarEvent) => {
            calls.addCalendarEvent++;
            e.id = 'random';
            dav_events[e.id] = {'calendar': e._calendar, 'id': e.id, 'ical': e.toIcal()};
            return of(e);
        },
        deleteCalendarEvent: (id: string) => {
            calls.deleteCalendarEvent++;
            delete dav_events[id];
            return of('mmm coffee');
        },
    } as RunboxWebmailAPI;

    // This is a deliberate mess, rrules and their exceptions should not be
    // stored separately, but older versions of the REST service did.
    // this needs to be parsed, as 2 events
    beforeEach(() => {
        ICAL.TimezoneService.reset();
        dav_events = {
            'test/foo': {
                calendar: 'test',
                id: 'test/foo',
                ical: 'BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20190906T100000\nSUMMARY:Change me\nEND:VEVENT\nEND:VCALENDAR\n'
            },
            'test/rrule': {
                calendar: 'test',
                id: 'test/rrule',
                ical: 'BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDESCRIPTION;ALTREP="CID:<FFFF__":body\nDTEND:20210425T100000\nDTSTAMP:20210406T204303Z\nDTSTART:20210425T090000\nRRULE:FREQ=DAILY;COUNT=5\nSEQUENCE:0\nSUMMARY:More complicated stream (5 day recurring)\nTRANSP:OPAQUE\nUID:6BA1ECA4D58B306C85256FDB0071B664-Lotus_Notes_Generated\nEND:VEVENT\nEND:VCALENDAR\n'
            },
            'test/exception': {
                calendar: 'test',
                id: 'test/exception',
                ical: 'BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nCOMMENT;ALTREP="CID:<FFFF__":Reschedule of a single instance\'s time only (+ 1 hr)\nDESCRIPTION;ALTREP="CID:<FFFE__":body\nDTEND:20210426T110000\nDTSTAMP:20210406T205010Z\nDTSTART:20210426T100000\nRDATE;VALUE=PERIOD:20210426T100000/20210426T110000\nRECURRENCE-ID:20210426T130000Z\nSEQUENCE:1\nSUMMARY:More complicated stream (5 day recurring)\nTRANSP:OPAQUE\nUID:6BA1ECA4D58B306C85256FDB0071B664-Lotus_Notes_Generated\nEND:VEVENT\nEND:VCALENDAR\n'
            }
        };

        for (const key of Object.keys(calls)) {
            calls[key] = 0;
        }

        localStorage.clear();
        storage = new StorageService(rmmapi);
        sut = new CalendarService(rmmapi, storage);
        clearInterval(sut.syncInterval);
    });

    it('should be able to add a new event', async () => {
        const newEvent = RunboxCalendarEvent.newEmpty();
        newEvent.dtstart = moment().date(1).hours(13).seconds(0).milliseconds(0);
        newEvent.dtend = moment().date(1).hours(14).seconds(0).milliseconds(0);
        newEvent.title = 'New Event';
        newEvent.location = 'Somewhere';
        const newId = await sut.addEvent(newEvent);
        expect(newId).toBeTruthy();
    });

    it('should be able to add a new event with timezone', async () => {
        sut.loadVTimezone('Europe/Stockholm');
        const newEvent = RunboxCalendarEvent.newEmpty('/citadel.org/20210210_1/Europe/Stockholm');
        newEvent.dtstart = moment().date(1).hours(13).seconds(0).milliseconds(0);
        newEvent.dtend = moment().date(1).hours(14).seconds(0).milliseconds(0);
        newEvent.title = 'New Event';
        newEvent.location = 'Somewhere';
        const newId = await sut.addEvent(newEvent);
        expect(newId).toBeTruthy();
        expect(newEvent.ical.toString()).toContain('VTIMEZONE');
    });

    it('should modify event when asked', async () => {
        await new Promise(r => sut.eventSubject.pipe(take(1)).subscribe(events => {
            expect(sut.icalevents.length).toBe(2, '2 ical events found');
            expect(events.length).toBe(6, '6 events generated');
            const event = events[0];
            event.title = 'Changed!';
            sut.modifyEvent(event);
            r(null);
        }));

        await new Promise(r => sut.eventSubject.pipe(take(1)).subscribe(events => {
            expect(sut.icalevents.length).toBe(2, '2 ical events found');
            expect(events.length).toBe(6, '6 events loaded');
            const event = events[0];
            expect(event.title).toBe('Changed!', 'event got updated');

            expect(calls.modifyCalendarEvent).toBe(1, '1 modification performed in the API');
            expect(calls.addCalendarEvent   ).toBe(0, 'no events were added');
            expect(calls.deleteCalendarEvent).toBe(0, 'no events were deleted');
            r(null);
        }));
    });

    it('should be able to move events between calendars', async () => {
        expect(sut.icalevents.length).toBe(0, 'No ical events found');
        expect(sut.events.length).toBe(0, 'No events loaded');

        await new Promise(r => sut.eventSubject.pipe(take(1)).subscribe(events => {
            expect(sut.icalevents.length).toBe(2, '2 ical events found');
            expect(events.length).toBe(6, '6 events loaded');
            events[0].calendar = 'test2';
            sut.modifyEvent(events[0]);
            r(null);
        }));

        await new Promise(r => sut.eventSubject.pipe(take(1)).subscribe(events => {
            expect(sut.icalevents.length).toBe(2, '2 ical events found');
            expect(events.length).toBe(6, '6 events loaded');
            const event = events[0];
            expect(event.calendar).toBe('test2', 'event got moved');

            expect(calls.modifyCalendarEvent).toBe(0, 'no modifications performed in the API');
            expect(calls.addCalendarEvent   ).toBe(1, '1 event was added');
            expect(calls.deleteCalendarEvent).toBe(1, '1 event was deleted');
            r(null);
        }));
    });

    it('should be possible to  import an .ics file', () => {
        sut.importFromIcal(undefined,
`BEGIN:VCALENDAR
X-LOTUS-CHARSET:UTF-8
VERSION:2.0
PRODID:-//Lotus Development Corporation//NONSGML Notes 6.0//EN
METHOD:REQUEST
BEGIN:VTIMEZONE
TZID:Eastern
BEGIN:STANDARD
DTSTART:19501029T020000
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
RRULE:FREQ=YEARLY;BYMINUTE=0;BYHOUR=2;BYDAY=-1SU;BYMONTH=10
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:19500402T020000
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
RRULE:FREQ=YEARLY;BYMINUTE=0;BYHOUR=2;BYDAY=1SU;BYMONTH=4
END:DAYLIGHT
END:VTIMEZONE
BEGIN:VEVENT
DTSTART;TZID="Eastern":20210411T090000
DTEND;TZID="Eastern":20210411T100000
TRANSP:OPAQUE
RRULE:FREQ=DAILY;COUNT=5
DTSTAMP:20210406T201221Z
SEQUENCE:0
ATTENDEE;ROLE=CHAIR;PARTSTAT=ACCEPTED;CN="iCal Chair/CoffeeBean"
 ;RSVP=FALSE:mailto:iCalChair@coffeebean.com
ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION
 ;CN="iCal Participant/CoffeeBean";RSVP=TRUE
 :mailto:iCalParticipant@coffeebean.com
CLASS:PUBLIC
SUMMARY:5 day daily repeating meeting
ORGANIZER;CN="iCal Chair/CoffeeBean":mailto:iCalChair@coffeebean.com
UID:F88157FE01BE8A5C85256FDB006EBCC3-Lotus_Notes_Generated
END:VEVENT
END:VCALENDAR
`, true);
        const rbevents = sut.generateEvents();
        // Produces multiple CalendarEvents which refer to the same ICal.Event
        expect(rbevents.length).toEqual(5, 'Recurring event contains 5 instances');
        expect(rbevents[0].recurringFrequency).toEqual('DAILY', 'recurrence is DAILY');
    });

    it('should be possible to import an .ics file with exceptions', () => {
        sut.loadVTimezone('Europe/Stockholm');
        sut.importFromIcal(undefined,
`BEGIN:VCALENDAR
X-LOTUS-CHARSET:UTF-8
VERSION:2.0
PRODID:-//Lotus Development Corporation//NONSGML Notes 6.0//EN
METHOD:REQUEST
BEGIN:VTIMEZONE
TZID:Eastern
BEGIN:STANDARD
DTSTART:19501029T020000
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
RRULE:FREQ=YEARLY;BYMINUTE=0;BYHOUR=2;BYDAY=-1SU;BYMONTH=10
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:19500402T020000
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
RRULE:FREQ=YEARLY;BYMINUTE=0;BYHOUR=2;BYDAY=1SU;BYMONTH=4
END:DAYLIGHT
END:VTIMEZONE
BEGIN:VEVENT
DTSTART;TZID=Eastern:20210425T090000
DTEND;TZID=Eastern:20210425T100000
TRANSP:OPAQUE
RRULE:FREQ=DAILY;COUNT=5
DTSTAMP:20210406T204303Z
SEQUENCE:0
ATTENDEE;ROLE=CHAIR;PARTSTAT=ACCEPTED;CN="iCal Chair/CoffeeBean"
 ;RSVP=FALSE:mailto:iCalChair@coffeebean.com
ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION
 ;CN="iCal Participant/CoffeeBean";RSVP=TRUE
 :mailto:iCalParticipant@coffeebean.com
CLASS:PUBLIC
DESCRIPTION;ALTREP="CID:<FFFF__=0ABBE548DFE230F48f9e8a93d@coffeebean.com>":body
SUMMARY:More complicated stream (5 day recurring)
ORGANIZER;CN="iCal Chair/CoffeeBean":mailto:iCalChair@coffeebean.com
UID:7BA1ECA4D58B306C85256FDB0071B664-Lotus_Notes_Generated
END:VEVENT
BEGIN:VEVENT
DTSTART;TZID=Eastern:20210426T100000
DTEND;TZID=Eastern:20210426T110000
TRANSP:OPAQUE
RDATE;TZID=Eastern;VALUE=PERIOD:20210426T100000/20210426T110000
RECURRENCE-ID:20210426T130000Z
DTSTAMP:20210406T205010Z
COMMENT;ALTREP="CID:<FFFF__=0ABBE548DFE1E66E8f9e8a93d@coffeebean.com>":Reschedule of a single instance's time only (+ 1 hr)
SEQUENCE:1
ATTENDEE;ROLE=CHAIR;PARTSTAT=ACCEPTED;CN="iCal Chair/CoffeeBean"
 ;RSVP=FALSE:mailto:iCalChair@coffeebean.com
ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION
 ;CN="iCal Participant/CoffeeBean";RSVP=TRUE
 :mailto:iCalParticipant@coffeebean.com
CLASS:PUBLIC
DESCRIPTION;ALTREP="CID:<FFFE__=0ABBE548DFE1E66E8f9e8a93d@coffeebean.com>":body
SUMMARY:More complicated stream (5 day recurring)
ORGANIZER;CN="iCal Chair/CoffeeBean":mailto:iCalChair@coffeebean.com
UID:7BA1ECA4D58B306C85256FDB0071B664-Lotus_Notes_Generated
END:VEVENT
END:VCALENDAR
`, true);
        const rbevents = sut.generateEvents();
        // Produces multiple CalendarEvents which refer to the same ICal.Event
        expect(rbevents.length).toEqual(5, 'Recurring event contains 5 instances');
        expect(rbevents[0].recurringFrequency).toEqual('DAILY', 'recurrence is DAILY');
        expect(rbevents[0].start).toEqual(new Date(2021, 3, 25, 15, 0, 0), 'event 1 start date is 3pm in Stockholm');
        expect(rbevents[1].start).toEqual(new Date(2021, 3, 26, 16, 0, 0), 'event 1 start date is 4pm in Stockholm');
    });

    it('should be possible to import a static (non recurring) event', () => {
        sut.importFromIcal(undefined,
`BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:PUBLISH
PRODID:-//FastMail/1.0/EN
X-APPLE-CALENDAR-COLOR:#0252D4
X-WR-CALNAME:Calendar
X-WR-TIMEZONE:Europe/London
BEGIN:VTIMEZONE
TZID:Europe/London
BEGIN:STANDARD
DTSTART:19700101T000000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
TZOFFSETFROM:+0100
TZOFFSETTO:+0000
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:19700101T000000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
TZOFFSETFROM:+0000
TZOFFSETTO:+0100
END:DAYLIGHT
END:VTIMEZONE
BEGIN:VEVENT
DTEND;TZID=Europe/London:20201127T200000
DTSTAMP:20201027T165951Z
DTSTART;TZID=Europe/London:20201127T180000
LOCATION:Home
SEQUENCE:0
SUMMARY:Static event
TRANSP:OPAQUE
UID:030b96e1-0e35-4725-84c6-2e564107970a
END:VEVENT
END:VCALENDAR
`, true);
        const rbevents = sut.generateEvents();
        expect(rbevents.length).toEqual(1, 'Imported one static event');
    });

    it('should be possible to import/generate an infinitely repeating event', () => {
        // This just says "WEEKLY", internals will figure out which
        // day the startdate is and use that for the repeats.
        sut.importFromIcal(undefined,
`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//www.contactoffice.com//NONSGML Calendar//EN
BEGIN:VTIMEZONE
TZID:Europe/London
X-TZINFO:Europe/London[2019c/Partial@9223372036854775807]
BEGIN:DAYLIGHT
TZOFFSETTO:+010000
TZOFFSETFROM:+000000
TZNAME:Europe/London(DST)
DTSTART:15320325T010000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETTO:+000000
TZOFFSETFROM:+010000
TZNAME:Europe/London(STD)
DTSTART:19971026T020000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
DTSTAMP;VALUE=DATE-TIME:20201015T100822Z
LAST-MODIFIED:20201015T100519Z
DTSTART;TZID=Europe/London;VALUE=DATE-TIME:20201012T190000
DTEND;TZID=Europe/London;VALUE=DATE-TIME:20201012T230000
X-MICROSOFT-CDO-BUSYSTATUS:BUSY
RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO
EXDATE:20240412T180000Z
DESCRIPTION:In a pub
SUMMARY:Monday Games
LOCATION:Somewhere
UID:com_264201470
TRANSP:OPAQUE
END:VEVENT
END:VCALENDAR
`, true);
        const rbevents = sut.generateEvents();
        // defaults to 2 months worth of events
        expect(rbevents.length).toBeGreaterThan(7, 'Got more than 7 weekly events');
        expect(rbevents[0].start.getDay()).toEqual(1, 'Generates dates on a Monday');
    });

    it('should be possible to determine the day/time from the dtstart value', () => {
        // This just says "WEEKLY", internals will figure out which
        // day the startdate is and use that for the repeats.
        sut.importFromIcal(undefined,
`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//www.contactoffice.com//NONSGML Calendar//EN
BEGIN:VTIMEZONE
TZID:Europe/London
X-TZINFO:Europe/London[2019c/Partial@9223372036854775807]
BEGIN:DAYLIGHT
TZOFFSETTO:+010000
TZOFFSETFROM:+000000
TZNAME:Europe/London(DST)
DTSTART:15320325T010000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETTO:+000000
TZOFFSETFROM:+010000
TZNAME:Europe/London(STD)
DTSTART:19971026T020000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
DTSTAMP;VALUE=DATE-TIME:20201015T100822Z
LAST-MODIFIED:20201015T100519Z
DTSTART;TZID=Europe/London;VALUE=DATE-TIME:20201012T190000
DTEND;TZID=Europe/London;VALUE=DATE-TIME:20201012T230000
X-MICROSOFT-CDO-BUSYSTATUS:BUSY
RRULE:FREQ=WEEKLY
EXDATE:20240412T180000Z
DESCRIPTION:In a pub
SUMMARY:Monday Games
LOCATION:Somewhere
UID:com_264201470
TRANSP:OPAQUE
END:VEVENT
END:VCALENDAR
`, true);
        let rbevents = sut.generateEvents();
        // The above generates by default all events from the
        // startdate of the recurring event, to 2 months in the
        // current future - generate a known set for tests.
        rbevents = sut.generateEvents(new Date(2020, 12, 1, 0, 0, 0), new Date(2021, 1, 1, 0, 0, 0));
        // These should generate on Mondays, using the dtstart as a pattern
        expect(rbevents.length).toBe(4, 'Got 4 weekly events');
        expect(rbevents[0].start.getDay()).toEqual(1, 'Generates dates on a Monday');
    });
});
