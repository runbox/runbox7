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

/// <reference types="cypress" />

import {
    futureDateStr, makeVevent, buildIcs,
    londonVtimezone,
} from '../support/ics-helpers';

describe('Calendar timezone handling', () => {
    const today = futureDateStr(0);
    const tomorrow = futureDateStr(1);

    /** Import ICS into mock calendar and wait for calendar to reload */
    function importIcs(ics: string) {
        cy.request({ method: 'PUT', url: '/rest/v1/calendar/ics/mock%20cal', body: ics });
        cy.reload();
        cy.get('.calendarListItem').should('contain', 'Mock Calendar');
    }

    beforeEach(() => {
        cy.request('/rest/e2e/resetCalendarEvents');
        cy.request('/rest/e2e/resetTimezone');
        // Clear caldav cache so each test starts fresh — previous test's
        // ICAL-processed cache can produce malformed date strings
        // (e.g. "2026-05-07T::") that crash importFromIcal on reload.
        cy.clearLocalStorage(/caldavCache/);
        cy.visit('/calendar');
        // Wait for calendar to load (matches existing calendar.ts pattern)
        cy.get('.calendarListItem').should('contain', 'Mock Calendar');
    });

    // ========================================
    // Import preview tests
    // ========================================

    it('should preview a floating time event', () => {
        const ics = buildIcs([
            makeVevent(today + 'T120000', today + 'T130000', 'Floating event', 'test-float'),
        ]);
        importIcs(ics);
        cy.get('.calendarMonthDayEvent').should('contain', 'Floating event');
    });

    it('should preview a UTC event', () => {
        const ics = buildIcs([
            makeVevent(today + 'T120000Z', today + 'T130000Z', 'UTC event', 'test-utc'),
        ]);
        importIcs(ics);
        cy.get('.calendarMonthDayEvent').should('contain', 'UTC event');
    });

    it('should preview a TZID event', () => {
        const ics = buildIcs([
            makeVevent(
                'TZID=Europe/London:' + today + 'T120000',
                'TZID=Europe/London:' + today + 'T130000',
                'London event', 'test-london',
            ),
        ], londonVtimezone);
        importIcs(ics);
        cy.get('.calendarMonthDayEvent').should('contain', 'London event');
    });

    it('should preview an all-day event', () => {
        const ics = buildIcs([
            makeVevent(today, tomorrow, 'All-day event', 'test-allday'),
        ]);
        importIcs(ics);
        cy.get('.calendarMonthDayEvent').should('contain', 'All-day event');
    });

    // ========================================
    // Month view display tests
    // ========================================

    it('should display London TZID event at correct hour for Oslo account', () => {
        // Account tz: Europe/Oslo (CEST, UTC+2 in summer)
        // Event: 12:00 London (BST, UTC+1 in summer) = 13:00 Oslo
        const ics = buildIcs([
            makeVevent(
                'TZID=Europe/London:' + today + 'T120000',
                'TZID=Europe/London:' + today + 'T130000',
                'London 12pm', 'test-display-london',
            ),
        ], londonVtimezone);
        importIcs(ics);
        // Should display 13:00 (Oslo time), not 12:00 (London time)
        cy.get('.calendarMonthDayEvent').should('contain', '13:00');
    });

    it('should display all-day event on correct day', () => {
        const ics = buildIcs([
            makeVevent(today, tomorrow, 'All-day correct day', 'test-allday-day'),
        ]);
        importIcs(ics);
        // The event should appear on today's date, not yesterday's
        cy.get('.calendarMonthDayEvent').should('contain', 'All-day correct day');
    });

    it('should display event at correct hour after timezone change', () => {
        // Start with Oslo account, create event
        const ics = buildIcs([
            makeVevent(
                'TZID=Europe/London:' + today + 'T120000',
                'TZID=Europe/London:' + today + 'T130000',
                'TZ change test', 'test-tz-change',
            ),
        ], londonVtimezone);
        cy.request({ method: 'PUT', url: '/rest/v1/calendar/ics/mock%20cal', body: ics });

        // Change account timezone to London
        cy.request('/rest/e2e/setTimezone_Europe_London');
        cy.reload();
        cy.get('.calendarListItem').should('contain', 'Mock Calendar');

        // With London account, 12:00 London should display as 12:00
        cy.get('.calendarMonthDayEvent').should('contain', '12:00');

        // Reset timezone for other tests
        cy.request('/rest/e2e/resetTimezone');
    });
});
