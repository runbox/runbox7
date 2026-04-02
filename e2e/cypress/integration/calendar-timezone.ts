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

function futureDateStr(daysFromNow: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString().replace(/-/g, '').replace(/T.*/, '');
}

function buildIcs(veventBlocks: string[], vtimezone?: string): string {
    const parts = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Runbox//E2E Test//EN',
    ];
    if (vtimezone) { parts.push(vtimezone); }
    parts.push(...veventBlocks, 'END:VCALENDAR');
    return parts.join('\r\n');
}

function dtLine(prefix: string, value: string): string {
    // ICS parameters use ';' separator (e.g. DTSTART;TZID=Europe/Oslo:20260416T140000)
    return value.includes('=') ? `${prefix};${value}` : `${prefix}:${value}`;
}

function makeVevent(dtstart: string, dtend: string, summary: string, uid: string, extra: string[] = []): string {
    return [
        'BEGIN:VEVENT',
        dtLine('DTSTART', dtstart),
        dtLine('DTEND', dtend),
        `SUMMARY:${summary}`,
        `UID:${uid}`,
        'DTSTAMP:20260101T000000Z',
        ...extra,
        'END:VEVENT',
    ].join('\r\n');
}

const osloVtimezone = [
    'BEGIN:VTIMEZONE',
    'TZID:/citadel.org/20210210_1/Europe/Oslo',
    'LAST-MODIFIED:20210210T123706Z',
    'X-LIC-LOCATION:Europe/Oslo',
    'BEGIN:STANDARD',
    'TZNAME:CET',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'DTSTART:19961027T030000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'BEGIN:DAYLIGHT',
    'TZNAME:CEST',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'DTSTART:19810329T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'END:VTIMEZONE',
].join('\r\n');

describe('Calendar timezone handling', () => {
    beforeEach(() => {
        cy.request('/rest/e2e/resetCalendarEvents');
        cy.visit('/calendar');
        cy.get('.calendarListItem').should('have.length', 1).and('contain', 'Mock Calendar');
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
});
