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

/** Generate a YYYYMMDD date string N days from now */
export function futureDateStr(daysFromNow: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString().split('T')[0].replace(/-/g, '');
}

/** Format a DTSTART/DTEND line with optional parameters */
export function dtLine(prefix: string, value: string): string {
    // iCalendar parameters use semicolon: DTSTART;TZID=Europe/London:20260508T120000
    if (value.startsWith('TZID=')) {
        return prefix + ';' + value;
    }
    // Date-only values (8 digits, no T) need VALUE=DATE so ICAL.js
    // skips timezone conversion in helpers.updateTimezones()
    if (/^\d{8}$/.test(value)) {
        return prefix + ';VALUE=DATE:' + value;
    }
    return prefix + ':' + value;
}

/** Build a VEVENT block */
export function makeVevent(
    dtstart: string,
    dtend: string,
    summary: string,
    uid: string,
    extra?: string[],
): string {
    const lines = [
        'BEGIN:VEVENT',
        dtLine('DTSTART', dtstart),
        dtLine('DTEND', dtend),
        'SUMMARY:' + summary,
        'UID:' + uid,
    ];
    if (extra) {
        lines.push(...extra);
    }
    lines.push('END:VEVENT');
    return lines.join('\r\n');
}

/** Assemble a valid ICS calendar from VEVENT blocks and optional VTIMEZONE */
export function buildIcs(veventBlocks: string[], vtimezone?: string): string {
    const parts = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Runbox//Test//EN',
    ];
    if (vtimezone) {
        parts.push(vtimezone);
    }
    for (const block of veventBlocks) {
        parts.push(block);
    }
    parts.push('END:VCALENDAR');
    return parts.join('\r\n');
}

export const londonVtimezone = [
    'BEGIN:VTIMEZONE',
    'TZID:Europe/London',
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
    'DTSTART:19700329T010000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'END:VTIMEZONE',
].join('\r\n');
