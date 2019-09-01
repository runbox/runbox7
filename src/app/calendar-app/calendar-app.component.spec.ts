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

import { ComponentFixture, TestBed, async, fakeAsync, tick } from '@angular/core/testing';
import { Http } from '@angular/http';
import { CalendarAppComponent } from './calendar-app.component';
import { CalendarAppModule } from './calendar-app.module';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Observable } from 'rxjs';
import { LocationStrategy, APP_BASE_HREF } from '@angular/common';
import { MatSnackBar } from '@angular/material';
import { RunboxCalendar } from './runbox-calendar';
import { RunboxCalendarEvent } from './runbox-calendar-event';
import * as moment from 'moment';
import { RRule } from 'rrule';

describe('CalendarAppComponent', () => {
    let component: CalendarAppComponent;
    let fixture: ComponentFixture<CalendarAppComponent>;

    const simpleEvents = [
        new RunboxCalendarEvent({ id: 'test-calendar/event0', VEVENT: {
            dtstart: moment().toISOString(),
            summary: 'Test Event #0',
        }}),
        new RunboxCalendarEvent({ id: 'test-calendar/event1', VEVENT: {
            dtstart: moment().add(1, 'month').add(1, 'day').toISOString(),
            summary: 'Event #1, next month',
        }}),
    ];

    const recurringEvents = [
        new RunboxCalendarEvent({ id: 'test-calendar/recurring', VEVENT: {
            dtstart: moment().date(1).toISOString(),
            summary: 'Weekly event #0',
            rrule: 'FREQ=WEEKLY',
        }}),
    ];

    const GH_179_recurring_yearly = [
        new RunboxCalendarEvent({ id: 'test-calendar/recurring-yearly', VEVENT: {
            dtstart: moment().date(5).toISOString().split('T')[0], // no time, so an all-day
            dtend: moment().date(6).toISOString().split('T')[0],
            summary: 'Yearly event',
            rrule: 'FREQ=YEARLY',
        }}),
    ];

    // the test below only makes sense when the event start date is not now()
    const not_today = moment().date() === 2 ? 3 : 2;

    const GH_181_setting_recurrence = [
        new RunboxCalendarEvent({ id: 'test-calendar/not-recurring-yet', VEVENT: {
            dtstart: moment().date(not_today).hour(12).minute(34).toISOString(),
            summary: 'One-shot event',
        }}),
    ];

    const mockData = {
        calendars: [ new RunboxCalendar({ id: 'test-calendar', displayname: 'Test Calendar', color: 'pink' }) ],
        events:    [] // set in test cases
    };

    beforeEach(async(() => {
    TestBed.configureTestingModule({
            imports: [
                CalendarAppModule,
                RouterTestingModule.withRoutes([])
              ],
            providers: [
                { provide: RunboxWebmailAPI, useValue: {
                    getCalendars:      (): Observable<RunboxCalendar[]> => of(mockData['calendars']),
                    getCalendarEvents: (): Observable<RunboxCalendarEvent[]> => of(mockData['events']),
                } },
                { provide: Http, useValue: {
                } },
                { provide: MatSnackBar, useValue: {
                } },
            ],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(CalendarAppComponent);
        component = fixture.componentInstance;
    });

    it('should display calendars', () => {
        expect(component).toBeTruthy();
        expect(component.calendars[0]).toBeDefined();

        fixture.detectChanges();

        const calendar = fixture.debugElement.nativeElement.querySelector('.calendarListItem');
        expect(calendar).toBeDefined();
        expect(calendar.innerText).toContain('Test Calendar', 'test calendar is displayed on the list');

        const icon = calendar.querySelector('.calendarColorLabel', 'test calendar has a correct icon colour');
        expect(icon.style.color).toBe('pink');
    });

    it('should display events', () => {
        mockData['events'] = simpleEvents;
        component.calendarservice.reloadEvents();

        expect(component.events.length).toBe(2);

        fixture.detectChanges();

        const events = fixture.debugElement.nativeElement.querySelectorAll('button.calendarMonthDayEvent');
        expect(events.length).toBe(1, 'only events from this month should be displayed');

        const event = events[0];
        expect(event.innerText).toContain('Test Event #0', 'test event is displayed in the month view');
    });

    it('should be possible to hide calendars', () => {
        mockData['events'] = simpleEvents;
        component.calendarservice.reloadEvents();
        fixture.detectChanges();

        let events = fixture.debugElement.nativeElement.querySelectorAll('button.calendarMonthDayEvent');
        expect(events[0].innerText).toContain('Test Event #0', 'test event is displayed in the month view');

        fixture.debugElement.nativeElement.querySelector('button.calendarToggleButton').click();
        events = fixture.debugElement.nativeElement.querySelectorAll('button.calendarMonthDayEvent');
        expect(events.length).toBe(0, 'events are gone from the screen');

        fixture.debugElement.nativeElement.querySelector('button.calendarToggleButton').click();
        events = fixture.debugElement.nativeElement.querySelectorAll('button.calendarMonthDayEvent');
        expect(events.length).toBe(1, 'events are back on the screen');
    });

    it('should display recurring events', () => {
        mockData['events'] = recurringEvents;
        component.calendarservice.reloadEvents();
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
        component.calendarservice.reloadEvents();
        fixture.detectChanges();

        const events = fixture.debugElement.nativeElement.querySelectorAll('button.calendarMonthDayEvent');
        expect(events.length).toBe(1, 'only one event should be displayed');
    });

    it('should not break event start date when setting recurrence (GH-181)', () => {
        mockData['events'] = GH_181_setting_recurrence;
        component.calendarservice.reloadEvents();
        fixture.detectChanges();

        let events = fixture.debugElement.nativeElement.querySelectorAll('button.calendarMonthDayEvent');
        expect(events.length).toBe(1, 'only one event should be displayed');

        mockData['events'][0].setRecurringFrequency(RRule.WEEKLY);
        component.calendarservice.reloadEvents();
        fixture.detectChanges();
        events = fixture.debugElement.nativeElement.querySelectorAll('button.calendarMonthDayEvent');
        expect(component.shown_events.length).toBeGreaterThan(2, 'more events should be displayed now');
        const first_occurence = component.shown_events[0].start;
        expect(first_occurence.getDate()).toBe(not_today, 'day matches');
        expect(first_occurence.getHours()).toBe(12, 'hour matches');
        expect(first_occurence.getMinutes()).toBe(34, 'minute matches');
    });
});
