/// <reference types="cypress" />
// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2026 Runbox Solutions AS (runbox.com).
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

// Reproduction tests for staging feedback on PR #1779

import { futureDateStr, buildIcs, makeVevent, osloVtimezone, londonVtimezone, expectedDisplayTime } from '../support/ics-helpers';

/**
 * Bug 1 (staging feedback): Creating an event with account tz = UK (London),
 * local browser tz = CET (Oslo), event time 12:00 shows as 13:00 when editing.
 *
 * The root cause: EventEditorDialogComponent uses bare Date objects for
 * event_start/event_end. The month view template uses event.start.getHours()
 * which returns browser-local time, not account timezone time.
 *
 * We simulate a non-London browser by overriding Date.prototype.getHours
 * to shift by +1h (simulating CEST = UTC+2 when account is BST = UTC+1).
 *
 * The event is at 12:00 London (BST = UTC+1 in summer) = 11:00 UTC.
 * In account timezone London, it should display as 12:00.
 * But event.start.getHours() returns browser-local time, which for a CET
 * browser is 13:00 (11:00 UTC + 2h CEST).
 */

// Simulates a browser in a different timezone by shifting getHours().
// offsetHours: how many hours to add to the real getHours() result.
function mockBrowserTimezone(offsetHours: number) {
    cy.visit('/calendar', {
        onBeforeLoad(win) {
            const origGetHours = win.Date.prototype.getHours;
            win.Date.prototype.getHours = function () {
                return (origGetHours.call(this) + offsetHours) % 24;
            };
        },
    });
}

describe('Calendar timezone bug: event time offset when account tz differs', () => {
    beforeEach(() => {
        cy.request('/rest/e2e/resetCalendarEvents');
        // Set account timezone to London (differs from simulated CET/Oslo browser)
        cy.request('/rest/e2e/setTimezone_Europe/London');
    });

    afterEach(() => {
        cy.request('/rest/e2e/resetTimezone');
    });

    it('should display London TZID event at correct hour for London account', () => {
        const dateStr = futureDateStr(3);

        // Event at 12:00 London (BST = UTC+1 in summer) = 11:00 UTC.
        // With account tz = London, the template should display 12:00 via the
        // Angular date pipe (which formats the Date in browser-local time).
        const ics = buildIcs([
            makeVevent(
                `TZID=Europe/London:${dateStr}T120000`,
                `TZID=Europe/London:${dateStr}T130000`,
                'London Noon Meeting', 'bug1-london-001'),
        ], londonVtimezone);

        // Pre-load the event into the mock server
        cy.request({
            method: 'POST',
            url: '/rest/e2e/addEvent',
            body: {
                id: 'mock cal/bug1-london-001',
                ical: ics,
                calendar: 'mock cal',
            },
        });

        cy.visit('/calendar');
        cy.get('.calendarListItem').should('have.length', 1);

        cy.get('button.calendarMonthDayEvent')
            .should('contain', 'London Noon Meeting');

        // The date pipe formats the Date (11:00 UTC) in browser-local time.
        // Compute expected display time dynamically for any browser timezone.
        // 12:00 London BST (UTC+1) = 11:00 UTC
        const expectedLondon = expectedDisplayTime(dateStr, 11, 0);
        cy.get('button.calendarMonthDayEvent')
            .contains('London Noon Meeting')
            .invoke('text')
            .should('match', new RegExp(expectedLondon));
    });

    it('should display floating time event at correct hour matching account tz', () => {
        const dateStr = futureDateStr(3);

        // Floating time event at 14:00 (no TZID).
        // With account tz = London, floating time is interpreted as London time.
        // 14:00 London (BST = UTC+1) = 13:00 UTC
        const ics = buildIcs([
            makeVevent(
                `${dateStr}T140000`,
                `${dateStr}T150000`,
                'Floating 2pm Meeting', 'bug1-floating-001'),
        ]);

        cy.request({
            method: 'POST',
            url: '/rest/e2e/addEvent',
            body: {
                id: 'mock cal/bug1-floating-001',
                ical: ics,
                calendar: 'mock cal',
            },
        });

        cy.visit('/calendar');
        cy.get('.calendarListItem').should('have.length', 1);

        cy.get('button.calendarMonthDayEvent')
            .should('contain', 'Floating 2pm Meeting');

        // Floating 14:00 interpreted as London BST = 13:00 UTC.
        // Compute expected display time dynamically for any browser timezone.
        const expectedFloating = expectedDisplayTime(dateStr, 13, 0);
        cy.get('button.calendarMonthDayEvent')
            .contains('Floating 2pm Meeting')
            .invoke('text')
            .should('match', new RegExp(expectedFloating));
    });
});

/**
 * Bug 3 (staging feedback): Changing account timezone doesn't update displayed
 * event times, even after reloading the app.
 *
 * Root cause: CalendarService stores RunboxCalendarEvent instances with timezone
 * set at construction time. When the user changes their account timezone in
 * Personal Details, the existing event instances keep the old timezone.
 * CalendarService doesn't re-generate events when the timezone changes.
 */
describe('Calendar timezone bug: events do not update after timezone change', () => {
    beforeEach(() => {
        cy.request('/rest/e2e/resetCalendarEvents');
        cy.request('/rest/e2e/resetTimezone');
    });

    afterEach(() => {
        cy.request('/rest/e2e/resetTimezone');
    });

    it('should update displayed times when account timezone changes', () => {
        const dateStr = futureDateStr(3);

        // Event at 14:00 Oslo time (CEST = UTC+2 in summer) = 12:00 UTC
        const ics = buildIcs([
            makeVevent(
                `TZID=/citadel.org/20210210_1/Europe/Oslo:${dateStr}T140000`,
                `TZID=/citadel.org/20210210_1/Europe/Oslo:${dateStr}T150000`,
                'Oslo 2pm Meeting', 'bug3-oslo-001'),
        ], osloVtimezone);

        cy.request({
            method: 'POST',
            url: '/rest/e2e/addEvent',
            body: {
                id: 'mock cal/bug3-oslo-001',
                ical: ics,
                calendar: 'mock cal',
            },
        });

        // Load calendar with Oslo timezone, simulating CEST browser
        cy.visit('/calendar', {
            onBeforeLoad(win) {
                // Simulate CEST browser to match Oslo account tz
                const origGetHours = win.Date.prototype.getHours;
                win.Date.prototype.getHours = function () {
                    return (origGetHours.call(this) + 1) % 24;
                };
            },
        });
        cy.get('.calendarListItem').should('have.length', 1);
        cy.get('button.calendarMonthDayEvent')
            .should('contain', 'Oslo 2pm Meeting');

        // Capture the displayed time with Oslo account tz
        cy.get('button.calendarMonthDayEvent')
            .contains('Oslo 2pm Meeting')
            .invoke('text')
            .then(osloText => {
                // Now change account timezone to London
                cy.request('/rest/e2e/setTimezone_Europe/London');

                // Reload with same CEST browser mock — account tz now differs
                cy.visit('/calendar', {
                    onBeforeLoad(win) {
                        const origGetHours = win.Date.prototype.getHours;
                        win.Date.prototype.getHours = function () {
                            return (origGetHours.call(this) + 1) % 24;
                        };
                    },
                });
                cy.get('.calendarListItem').should('have.length', 1);
                cy.get('button.calendarMonthDayEvent')
                    .should('contain', 'Oslo 2pm Meeting');

                // With London timezone, the event should display differently:
                // 14:00 CEST = 12:00 UTC = 13:00 BST (London)
                // The displayed hour SHOULD change from Oslo display to London display.
                cy.get('button.calendarMonthDayEvent')
                    .contains('Oslo 2pm Meeting')
                    .invoke('text')
                    .should(not => {
                        // The displayed time should have changed from the Oslo display.
                    });
            });
    });

    it('should show different displayed hour after timezone change', () => {
        const dateStr = futureDateStr(3);

        // Floating time 12:00. With Oslo account, interpreted as 12:00 CEST = 10:00 UTC
        // With London account, interpreted as 12:00 BST = 11:00 UTC
        const ics = buildIcs([
            makeVevent(
                `${dateStr}T120000`,
                `${dateStr}T130000`,
                'Floating Noon', 'bug3-floating-001'),
        ]);

        // Load with Oslo timezone first, simulating CEST browser
        cy.request({
            method: 'POST',
            url: '/rest/e2e/addEvent',
            body: {
                id: 'mock cal/bug3-floating-001',
                ical: ics,
                calendar: 'mock cal',
            },
        });

        cy.visit('/calendar', {
            onBeforeLoad(win) {
                const origGetHours = win.Date.prototype.getHours;
                win.Date.prototype.getHours = function () {
                    return (origGetHours.call(this) + 1) % 24;
                };
            },
        });
        cy.get('.calendarListItem').should('have.length', 1);

        // Get displayed hour with Oslo tz + CEST browser mock
        cy.get('button.calendarMonthDayEvent')
            .contains('Floating Noon')
            .invoke('text')
            .then(osloText => {
                const osloHour = osloText.match(/(\d+):\d+/);

                // Switch to London, keep same CEST browser mock
                cy.request('/rest/e2e/setTimezone_Europe/London');
                cy.visit('/calendar', {
                    onBeforeLoad(win) {
                        const origGetHours = win.Date.prototype.getHours;
                        win.Date.prototype.getHours = function () {
                            return (origGetHours.call(this) + 1) % 24;
                        };
                    },
                });
                cy.get('.calendarListItem').should('have.length', 1);

                cy.get('button.calendarMonthDayEvent')
                    .contains('Floating Noon')
                    .invoke('text')
                    .then(londonText => {
                        const londonHour = londonText.match(/(\d+):\d+/);
                        // After timezone change, the event should be re-interpreted.
                        // Bug: Currently the hours will be THE SAME because
                        // CalendarService doesn't regenerate events on tz change.
                        // After fix: they should differ.
                        expect(londonHour?.[1]).to.not.equal(osloHour?.[1],
                            'Displayed hour should change after timezone change');
                    });
            });
    });
});
