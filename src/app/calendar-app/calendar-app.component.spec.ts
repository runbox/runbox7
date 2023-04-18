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

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { CalendarAppComponent } from './calendar-app.component';
import { CalendarAppModule } from './calendar-app.module';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RMMAuthGuardService } from '../rmmapi/rmmauthguard.service';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { LogoutService } from '../login/logout.service';
import { MobileQueryService } from '../mobile-query.service';
import { StorageService } from '../storage.service';
import { SearchService } from '../xapian/searchservice';
import { UsageReportsService } from '../common/usage-reports.service';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Observable } from 'rxjs';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { RunboxCalendar } from './runbox-calendar';
import { RunboxCalendarEvent } from './runbox-calendar-event';
import { MatIcon } from '@angular/material/icon';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import moment from 'moment';
import ICAL from 'ical.js';

describe('CalendarAppComponent', () => {
    let component: CalendarAppComponent;
    let fixture: ComponentFixture<CalendarAppComponent>;

    // jCal spec: https://tools.ietf.org/html/rfc7265
    const simpleEvents = [
        {'id': 'test-calendar/event0',
         'ical': new ICAL.Component(['vcalendar', [], [ [ 'vevent', [
             [ 'dtstart', {}, 'date-time', moment().toISOString() ],
             [ 'dtend',   {}, 'date-time', moment().add(1, 'hour').toISOString() ],
            [ 'summary', {}, 'text',      'Test Event #0'        ],
         ]]]]).toString(),
         'calendar': 'test-calendar',
        },
        {'id': 'test-calendar/event1',
         'ical': new ICAL.Component(['vcalendar', [], [ [ 'vevent', [
             [ 'dtstart', {}, 'date-time', moment().date(15).add(1, 'month').add(1, 'day').add(2, 'hour').toISOString() ],
             [ 'dtend', {}, 'date-time', moment().date(15).add(1, 'month').add(1, 'day').add(3, 'hour').toISOString() ],
            [ 'summary', {}, 'text',      'Event #1, next month' ],
         ]]]]).toString(),
         'calendar': 'test-calendar',
        }
    ];

    const recurringEvents = [
        { 'id': 'test-calendar/recurring',
          'ical': new ICAL.Component(['vcalendar', [], [ [ 'vevent', [
            [ 'dtstart', {}, 'date-time', moment().date(15).toISOString() ],
              [ 'dtend', {}, 'date-time', moment().add(1, 'hour').date(15).toISOString() ],
            [ 'summary', {}, 'text',      'Weekly Event #0' ],
            [ 'rrule',   {}, 'recur',     {'freq': 'WEEKLY'}     ],
          ]]]]).toString(),
          'calendar': 'test-calendar',
        }];

    const GH_179_recurring_yearly = [
        { 'id': 'test-calendar/recurring-yearly',
          'ical': new ICAL.Component(['vcalendar', [], [ [ 'vevent', [
            [ 'dtstart', {}, 'date',  moment().date(5).toISOString().split('T')[0] ],
            [ 'dtend',   {}, 'date',  moment().date(6).toISOString().split('T')[0] ],
            [ 'summary', {}, 'text',  'Yearly event' ],
            [ 'rrule',   {}, 'recur',  {'freq': 'YEARLY'}  ],
          ]]]]).toString(),
          'calendar': 'test-calendar',
        }];

    const GH_181_setting_recurrence = [
        {'id': 'test-calendar/not-recurring-yet',
         'ical': new ICAL.Component(['vcalendar', [], [[ 'vevent', [
             [ 'dtstart', {}, 'date-time', moment.utc().date(1).hour(12).minute(34).toISOString() ],
             [ 'dtend',   {}, 'date-time', moment.utc().date(1).hour(13).minute(34).toISOString() ],
             [ 'summary', {}, 'text',      'One-shot event' ],
         ]]]]).toString(),
         'calendar': 'test-calendar',
        }];

    const mockData = {
        calendars: [ new RunboxCalendar({ id: 'test-calendar', displayname: 'Test Calendar', color: 'pink', syncToken: 'testsync' }) ],
        events:    [], // set in test cases
        timezone:
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
`    };

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
                imports: [
                    NoopAnimationsModule,
                    CalendarAppModule,
                    RouterTestingModule.withRoutes([]),
                    MatIconTestingModule,
                  ],
                providers: [
                    MobileQueryService,
                    StorageService,
                    { provide: RMMAuthGuardService, useValue: {
                        canActivate:      (_r, _s) => true,
                        canActivateChild: (_r, _s) => true,
                        isLoggedIn:       () => of(true),
                    } },
                    { provide: RunboxWebmailAPI, useValue: {
                        getCalendars:      (): Observable<RunboxCalendar[]> => of(mockData['calendars']),
                        getCalendarEvents: (): Observable<RunboxCalendarEvent[]> => of(mockData['events']),
                        getVTimezone:      (tzname: string): Observable<string> => of(mockData['timezone']),
                        me:                    of({ uid: 1, timezone: 'Europe/London' }),
                    } },
                    { provide: HttpClient, useValue: {
                    } },
                    { provide: MatSnackBar, useValue: {
                    } },
                    { provide: LogoutService, useValue: {
                    } },
                    { provide: SearchService, useValue: {
                    } },
                    { provide: UsageReportsService, useValue: {
                        report: (_: string) => { }
                    } },
                ],
                declarations: [MatIcon],
            }).compileComponents();
    }));

    beforeEach(() => {
        localStorage.clear();
        fixture = TestBed.createComponent(CalendarAppComponent);
        component = fixture.componentInstance;
    });

    it('should display calendars', () => {
        expect(component).toBeTruthy();
        component.calendarservice.syncCaldav();
        fixture.detectChanges();

        expect(component.calendars[0]).toBeDefined();

        const calendar = fixture.debugElement.nativeElement.querySelector('.calendarListItem');
        expect(calendar).toBeDefined();
        expect(calendar.innerText).toContain('Test Calendar', 'test calendar is displayed on the list');

        const icon = calendar.querySelector('.calendarColorLabel', 'test calendar has a correct icon colour');
        expect(icon.style.color).toBe('pink');
    });

    it('should display events', () => {
        mockData['events'] = simpleEvents;
        component.calendarservice.syncCaldav(true);
        fixture.detectChanges();

        // if we run this at the end of the month, it might be 1, else
        // generally 2!
        expect(component.events.length).toBeGreaterThan(0);

        fixture.detectChanges();

        const events = fixture.debugElement.nativeElement.querySelectorAll('button.calendarMonthDayEvent');
        expect(events.length).toBe(1, 'only events from this month should be displayed');

        const event = events[0];
        expect(event.innerText).toContain('Test Event #0', 'test event is displayed in the month view');
    });

    it('should be possible to hide calendars', () => {
        mockData['events'] = simpleEvents;
        component.calendarservice.syncCaldav(true);
        fixture.detectChanges();

        let events = fixture.debugElement.nativeElement.querySelectorAll('button.calendarMonthDayEvent');
        expect(events[0].innerText).toContain('Test Event #0', 'test event is displayed in the month view');

        fixture.debugElement.nativeElement.querySelector('button.calendarToggleButton').click();
        fixture.detectChanges();
        events = fixture.debugElement.nativeElement.querySelectorAll('button.calendarMonthDayEvent');
        expect(events.length).toBe(0, 'events are gone from the screen');

        fixture.debugElement.nativeElement.querySelector('button.calendarToggleButton').click();
        fixture.detectChanges();
        events = fixture.debugElement.nativeElement.querySelectorAll('button.calendarMonthDayEvent');
        expect(events.length).toBe(1, 'events are back on the screen');
    });

    it('should display recurring events', () => {
        mockData['events'] = recurringEvents;
        component.calendarservice.syncCaldav(true);

        fixture.detectChanges();

        const shownEventsCount = component.shown_events.length;
        expect(shownEventsCount).toBeGreaterThan(3, 'at least 4 events should appear');

        fixture.debugElement.nativeElement.querySelector('button#nextPeriodButton').click();
        fixture.detectChanges();
        fixture.debugElement.nativeElement.querySelector('button#previousPeriodButton').click();
        fixture.detectChanges();
        expect(component.shown_events.length).toBe(shownEventsCount, 'same number of events shown after cycling through months');
    });

    it('should not display yearly events as longer than they are (GH-179)', () => {
        mockData['events'] = GH_179_recurring_yearly;
        component.calendarservice.syncCaldav(true);
        fixture.detectChanges();

        const events = fixture.debugElement.nativeElement.querySelectorAll('button.calendarMonthDayEvent');
        expect(events.length).toBe(1, 'only one calendar cell should be full');
    });

    it('should not break event start date when setting recurrence (GH-181)', () => {
        mockData['events'] = GH_181_setting_recurrence;
        component.calendarservice.syncCaldav(true);
        fixture.detectChanges();

        let events = fixture.debugElement.nativeElement.querySelectorAll('button.calendarMonthDayEvent');
        expect(events.length).toBe(1, 'only one event should be displayed');

        component.events[0].recurringFrequency = 'WEEKLY';
        component.calendarservice.updateEventList();
        fixture.detectChanges();

        events = fixture.debugElement.nativeElement.querySelectorAll('button.calendarMonthDayEvent');
        expect(component.shown_events.length).toBeGreaterThan(2, 'more events should be displayed now');
        const first_occurence = component.shown_events[0].start;
        expect(first_occurence.getDate()).toBe(1, 'day matches');
        expect(first_occurence.getHours()).toBe(12, 'hour matches');
        expect(first_occurence.getMinutes()).toBe(34, 'minute matches');
    });
});
