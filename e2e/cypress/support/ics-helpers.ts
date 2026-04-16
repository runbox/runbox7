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

export function futureDateStr(daysFromNow: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString().replace(/-/g, '').replace(/T.*/, '');
}

export function buildIcs(veventBlocks: string[], vtimezone?: string): string {
    const parts = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Runbox//E2E Test//EN',
    ];
    if (vtimezone) { parts.push(vtimezone); }
    parts.push(...veventBlocks, 'END:VCALENDAR');
    return parts.join('\r\n');
}

export function dtLine(prefix: string, value: string): string {
    return value.includes('=') ? `${prefix};${value}` : `${prefix}:${value}`;
}

export function makeVevent(dtstart: string, dtend: string, summary: string, uid: string, extra: string[] = []): string {
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

export const osloVtimezone = [
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

export const londonVtimezone = [
    'BEGIN:VTIMEZONE',
    'TZID:Europe/London',
    'X-LIC-LOCATION:Europe/London',
    'BEGIN:STANDARD',
    'TZNAME:GMT',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0000',
    'DTSTART:19701025T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'BEGIN:DAYLIGHT',
    'TZNAME:BST',
    'TZOFFSETFROM:+0000',
    'TZOFFSETTO:+0100',
    'DTSTART:19810329T010000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'END:VTIMEZONE',
].join('\r\n');
