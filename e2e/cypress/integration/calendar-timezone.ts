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

import { futureDateStr, buildIcs, makeVevent, osloVtimezone, londonVtimezone, expectedDisplayTime, dateStrMonth, dateStrYear, dateStrDay } from '../support/ics-helpers';

describe('Calendar timezone handling', () => {
    beforeEach(() => {
        cy.request('/rest/e2e/resetCalendarEvents');
        cy.intercept('GET', '/rest/v1/calendar/events_raw').as('eventsLoad');
        cy.visit('/calendar');
        cy.get('.calendarListItem').should('have.length', 1).and('contain', 'Mock Calendar');
        // Wait for the initial sync's reloadEvents() to complete so that no
        // in-flight GET can race with event creation via the dialog.
        cy.wait('@eventsLoad');
    });

    function selectIcs(ics: string) {
        cy.get('input[type=file]').selectFile({
            contents: Cypress.Buffer.from(ics),
            fileName: 'test.ics',
            mimeType: 'text/calendar',
        }, { force: true });
    }

    function doImport() {
        cy.get('mat-select').click();
        cy.contains('mat-option', 'Mock Calendar').click();
        cy.contains('button', 'Import events').click();
        cy.get('simple-snack-bar').should('contain', 'events imported');
    }

    // Navigate the calendar to the month containing the event so that
    // month-view assertions work regardless of when the test runs.
    function navigateToEventMonth(dateStr: string) {
        const targetMonth = dateStrMonth(dateStr);
        const targetYear = dateStrYear(dateStr);
        cy.then(() => {
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();
            const monthsAhead = (targetYear - currentYear) * 12 + (targetMonth - currentMonth);
            const buttonId = monthsAhead >= 0 ? '#nextPeriodButton' : '#previousPeriodButton';
            const clicks = Math.abs(monthsAhead);
            for (let i = 0; i < clicks; i++) {
                cy.get(buttonId).click();
            }
            if (clicks > 0) {
                cy.wait(500);
            }
        });
    }

    it('should display floating time event in import preview', () => {
        const dateStr = futureDateStr(15);
        selectIcs(buildIcs([
            makeVevent(`${dateStr}T140000`, `${dateStr}T150000`, 'Floating Time Meeting', 'tztest-floating-001',
                ['LOCATION:Oslo Office']),
        ]));
        cy.get('app-calendar-event-card .upcomingEventCard')
            .should('contain', 'Floating Time Meeting')
            .and('contain', 'Oslo Office');
    });

    it('should display UTC event in import preview', () => {
        const dateStr = futureDateStr(15);
        selectIcs(buildIcs([
            makeVevent(`${dateStr}T130000Z`, `${dateStr}T140000Z`, 'UTC Meeting', 'tztest-utc-001'),
        ]));
        cy.get('app-calendar-event-card .upcomingEventCard')
            .should('contain', 'UTC Meeting');
    });

    it('should display TZID event in import preview', () => {
        const dateStr = futureDateStr(15);
        selectIcs(buildIcs([
            makeVevent(`TZID=Europe/Oslo:${dateStr}T140000`, `TZID=Europe/Oslo:${dateStr}T150000`,
                'TZID Oslo Meeting', 'tztest-tzid-001'),
        ]));
        cy.get('app-calendar-event-card .upcomingEventCard')
            .should('contain', 'TZID Oslo Meeting');
    });

    it('should display all-day event in import preview', () => {
        const dateStr = futureDateStr(15);
        selectIcs(buildIcs([
            makeVevent(`VALUE=DATE:${dateStr}`, `VALUE=DATE:${futureDateStr(16)}`,
                'All Day Event', 'tztest-allday-001'),
        ]));
        cy.get('app-calendar-event-card .upcomingEventCard')
            .should('contain', 'All Day Event');
    });

    it('should display recurring event in import preview', () => {
        const dateStr = futureDateStr(15);
        selectIcs(buildIcs([
            makeVevent(`${dateStr}T100000`, `${dateStr}T110000`, 'Weekly Standup', 'tztest-recurring-001',
                ['RRULE:FREQ=WEEKLY;COUNT=4']),
        ]));
        cy.get('app-calendar-event-card .upcomingEventCard')
            .should('contain', 'Weekly Standup');
    });

    it('should display citadel-path TZID event in import preview', () => {
        const dateStr = futureDateStr(15);
        selectIcs(buildIcs([
            makeVevent(
                `TZID=/citadel.org/20210210_1/Europe/Oslo:${dateStr}T140000`,
                `TZID=/citadel.org/20210210_1/Europe/Oslo:${dateStr}T150000`,
                'Citadel Path Event', 'tztest-citadel-001'),
        ], osloVtimezone));
        cy.get('app-calendar-event-card .upcomingEventCard')
            .should('contain', 'Citadel Path Event');
    });

    it('should display multiple events from multi-event ICS', () => {
        const dateStr = futureDateStr(15);
        selectIcs(buildIcs([
            makeVevent(`${dateStr}T100000`, `${dateStr}T110000`, 'Floating Event', 'tztest-multi-floating'),
            makeVevent(`${dateStr}T120000Z`, `${dateStr}T130000Z`, 'UTC Event', 'tztest-multi-utc'),
            makeVevent(`TZID=Europe/Oslo:${dateStr}T140000`, `TZID=Europe/Oslo:${dateStr}T150000`,
                'TZID Event', 'tztest-multi-tzid'),
        ]));
        cy.get('app-calendar-event-card').should('have.length', 3);
        cy.get('app-calendar-event-card .upcomingEventCard')
            .should('contain', 'Floating Event')
            .and('contain', 'UTC Event')
            .and('contain', 'TZID Event');
    });

    it('should fully import a floating time event', () => {
        const dateStr = futureDateStr(15);
        selectIcs(buildIcs([
            makeVevent(`${dateStr}T140000`, `${dateStr}T150000`, 'Imported Floating Event', 'tztest-import-floating'),
        ]));
        cy.get('app-calendar-event-card .upcomingEventCard')
            .should('contain', 'Imported Floating Event');
        doImport();
    });

    it('should fully import a UTC event', () => {
        const dateStr = futureDateStr(15);
        selectIcs(buildIcs([
            makeVevent(`${dateStr}T130000Z`, `${dateStr}T140000Z`, 'Imported UTC Event', 'tztest-import-utc'),
        ]));
        cy.get('app-calendar-event-card .upcomingEventCard')
            .should('contain', 'Imported UTC Event');
        doImport();
    });

    // --- Timezone bug reproduction tests ---

    it('should display London TZID event at correct hour for London account', () => {
        cy.request('/rest/e2e/setTimezone_Europe/London');
        const dateStr = futureDateStr(3);

        // Event at 12:00 London (BST = UTC+1 in summer) = 11:00 UTC
        const ics = buildIcs([
            makeVevent(
                `TZID=Europe/London:${dateStr}T120000`,
                `TZID=Europe/London:${dateStr}T130000`,
                'London Noon Meeting', 'tz-london-001'),
        ], londonVtimezone);

        cy.request({
            method: 'POST',
            url: '/rest/e2e/addEvent',
            body: { id: 'mock cal/tz-london-001', ical: ics, calendar: 'mock cal' },
        });

        cy.visit('/calendar');
        cy.get('.calendarListItem').should('have.length', 1);
        navigateToEventMonth(dateStr);
        cy.get('button.calendarMonthDayEvent').should('contain', 'London Noon Meeting');

        const expected = expectedDisplayTime(dateStr, 11, 0);
        cy.get('button.calendarMonthDayEvent')
            .contains('London Noon Meeting')
            .invoke('text')
            .should('match', new RegExp(expected));

        cy.request('/rest/e2e/resetTimezone');
    });

    it('should display floating time event at correct hour matching account tz', () => {
        cy.request('/rest/e2e/setTimezone_Europe/London');
        const dateStr = futureDateStr(3);

        // Floating time 14:00 (no TZID) — interpreted as London BST = 13:00 UTC
        const ics = buildIcs([
            makeVevent(`${dateStr}T140000`, `${dateStr}T150000`, 'Floating 2pm Meeting', 'tz-floating-001'),
        ]);

        cy.request({
            method: 'POST',
            url: '/rest/e2e/addEvent',
            body: { id: 'mock cal/tz-floating-001', ical: ics, calendar: 'mock cal' },
        });

        cy.visit('/calendar');
        cy.get('.calendarListItem').should('have.length', 1);
        navigateToEventMonth(dateStr);
        cy.get('button.calendarMonthDayEvent').should('contain', 'Floating 2pm Meeting');

        const expected = expectedDisplayTime(dateStr, 13, 0);
        cy.get('button.calendarMonthDayEvent')
            .contains('Floating 2pm Meeting')
            .invoke('text')
            .should('match', new RegExp(expected));

        cy.request('/rest/e2e/resetTimezone');
    });

    it('should show different displayed hour after timezone change', () => {
        const dateStr = futureDateStr(3);

        // Floating time 12:00. Account timezone determines interpretation:
        // Oslo CEST = 12:00 local = 10:00 UTC, London BST = 12:00 local = 11:00 UTC.
        // These produce different local hours in any browser timezone.
        const ics = buildIcs([
            makeVevent(`${dateStr}T120000`, `${dateStr}T130000`, 'Floating Noon', 'tz-changeme'),
        ]);

        cy.request({
            method: 'POST',
            url: '/rest/e2e/addEvent',
            body: { id: 'mock cal/tz-changeme', ical: ics, calendar: 'mock cal' },
        });

        // View with default Oslo timezone
        cy.visit('/calendar');
        cy.get('.calendarListItem').should('have.length', 1);
        navigateToEventMonth(dateStr);

        cy.get('button.calendarMonthDayEvent')
            .contains('Floating Noon')
            .invoke('text')
            .then(osloText => {
                const osloHour = osloText.match(/(\d+):\d+/);

                // Switch to London timezone
                cy.request('/rest/e2e/setTimezone_Europe/London');
                cy.visit('/calendar');
                cy.get('.calendarListItem').should('have.length', 1);
                navigateToEventMonth(dateStr);

                cy.get('button.calendarMonthDayEvent')
                    .contains('Floating Noon')
                    .invoke('text')
                    .then(londonText => {
                        const londonHour = londonText.match(/(\d+):\d+/);
                        expect(londonHour?.[1]).to.not.equal(osloHour?.[1],
                            'Displayed hour should change after timezone change');
                    });
            });

        cy.request('/rest/e2e/resetTimezone');
    });

    it('should display 12pm Oslo event at correct hour in month view', () => {
        const dateStr = futureDateStr(3);

        // Event at 12:00 Oslo (CEST = UTC+2 in summer) = 10:00 UTC
        const ics = buildIcs([
            makeVevent(
                `TZID=/citadel.org/20210210_1/Europe/Oslo:${dateStr}T120000`,
                `TZID=/citadel.org/20210210_1/Europe/Oslo:${dateStr}T130000`,
                'Oslo Noon Event', 'tz-oslo-noon'),
        ], osloVtimezone);

        cy.request({
            method: 'POST',
            url: '/rest/e2e/addEvent',
            body: { id: 'mock cal/tz-oslo-noon', ical: ics, calendar: 'mock cal' },
        });

        cy.visit('/calendar');
        cy.get('.calendarListItem').should('have.length', 1);
        navigateToEventMonth(dateStr);
        cy.get('button.calendarMonthDayEvent').should('contain', 'Oslo Noon Event');

        const expected = expectedDisplayTime(dateStr, 10, 0);
        cy.get('button.calendarMonthDayEvent')
            .contains('Oslo Noon Event')
            .invoke('text')
            .should('match', new RegExp(expected));
    });

    it('should display all-day event on correct day in month view', () => {
        const dateStr = futureDateStr(3);
        const nextDay = futureDateStr(4);

        const ics = buildIcs([
            makeVevent(`VALUE=DATE:${dateStr}`, `VALUE=DATE:${nextDay}`, 'All-Day Event', 'tz-allday'),
        ]);

        cy.request({
            method: 'POST',
            url: '/rest/e2e/addEvent',
            body: { id: 'mock cal/tz-allday', ical: ics, calendar: 'mock cal' },
        });

        cy.visit('/calendar');
        cy.get('.calendarListItem').should('have.length', 1);
        navigateToEventMonth(dateStr);
        cy.get('button.calendarMonthDayEvent').should('contain', 'All-Day Event');

        const targetDay = dateStrDay(dateStr);
        // Avoids ambiguity when the month view shows two cells with the same day number
        cy.get('button.calendarMonthDayEvent')
            .contains('All-Day Event')
            .parents('.cal-cell-top')
            .find('.cal-day-number')
            .should(dayEl => {
                expect(parseInt(dayEl.text().trim(), 10)).to.equal(targetDay);
            });
    });

    it('should create all-day event via dialog on correct day', () => {
        // Switch to month view and navigate to next month for a clean view
        cy.contains('button.calendarToolbarButton', 'Month').click();
        cy.get('#nextPeriodButton').click();
        cy.wait(500);

        // Pick the 15th of next month — find its add-event button
        cy.get('.cal-cell-top').then(cells => {
            const targetDay = 15;
            let targetCell: JQuery = null;
            cells.each((i, el) => {
                const dayNum = parseInt(Cypress.$(el).find('.cal-day-number').text().trim(), 10);
                // First occurrence of targetDay in the grid belongs to the displayed month
                if (dayNum === targetDay && !targetCell) {
                    targetCell = Cypress.$(el);
                }
            });
            cy.wrap(targetCell).find('.add-new-event').invoke('css', 'visibility', 'visible');
            cy.wrap(targetCell).find('.add-new-event button').should('be.visible').click();
        });

        cy.get('mat-dialog-container').within(() => {
            cy.get('input[matInput]').first().clear().type('Created All-Day Event');
            cy.get('mat-checkbox').contains('All-day event').click();
            cy.get('#eventSubmitButton').click();
        });

        cy.get('button.calendarMonthDayEvent')
            .should('contain', 'Created All-Day Event');

        cy.get('button.calendarMonthDayEvent')
            .contains('Created All-Day Event')
            .parents('.cal-cell-top')
            .find('.cal-day-number')
            .should(dayEl => {
                expect(parseInt(dayEl.text().trim(), 10)).to.equal(15);
            });
    });

    it('should display multi-day all-day event starting on correct day', () => {
        const day1 = futureDateStr(3);
        const day4 = futureDateStr(6);

        const ics = buildIcs([
            makeVevent(`VALUE=DATE:${day1}`, `VALUE=DATE:${day4}`, 'Multi-Day Event', 'tz-multiday'),
        ]);

        cy.request({
            method: 'POST',
            url: '/rest/e2e/addEvent',
            body: { id: 'mock cal/tz-multiday', ical: ics, calendar: 'mock cal' },
        });

        cy.visit('/calendar');
        cy.get('.calendarListItem').should('have.length', 1);
        navigateToEventMonth(day1);
        cy.get('button.calendarMonthDayEvent').should('contain', 'Multi-Day Event');

        const startDay = dateStrDay(day1);
        // Find the event first, then verify its parent cell's day number.
        cy.get('button.calendarMonthDayEvent')
            .contains('Multi-Day Event')
            .parents('.cal-cell-top')
            .find('.cal-day-number')
            .should(dayEl => {
                expect(parseInt(dayEl.text().trim(), 10)).to.equal(startDay);
            });
    });
});
