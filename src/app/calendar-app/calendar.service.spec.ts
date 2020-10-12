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

import { StorageService } from '../storage.service';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { CalendarService } from './calendar.service';
import { RunboxCalendarEvent } from './runbox-calendar-event';
import { of } from 'rxjs';
import { take } from 'rxjs/operators';

describe('CalendarService', () => {
    let dav_events: any;

    // poor man's callcounter, as I don't have a proper rmmapi stub
    const calls = {
        modifyCalendarEvent: 0,
        addCalendarEvent:    0,
        deleteCalendarEvent: 0,
    };

    let storage: StorageService;
    let sut: CalendarService;

    const rmmapi = {
        me: of({ uid: 1 }),
        getCalendars: () => of([
            { id: 'test',  displayname: 'Test',  syncToken: 'asdf' },
            { id: 'test2', displayname: 'Test2', syncToken: 'ogon' }
        ]),
        getCalendarEvents: () => of(Object.values(dav_events)),
        modifyCalendarEvent: (e: RunboxCalendarEvent) => {
            calls.modifyCalendarEvent++;
            dav_events[e.id] = e;
            return of(e);
        },
        addCalendarEvent: (e: RunboxCalendarEvent) => {
            calls.addCalendarEvent++;
            e.id = 'random';
            dav_events[e.id] = e;
            return of(e);
        },
        deleteCalendarEvent: (id: string) => {
            calls.deleteCalendarEvent++;
            delete dav_events[id];
            return of('mmm coffee');
        },
    } as RunboxWebmailAPI;

    beforeEach(() => {
        dav_events = {
            'test/foo': {
                calendar: 'test',
                id: 'test/foo',
                ical: 'BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20190906T100000\nSUMMARY:Change me\nEND:VEVENT\nEND:VCALENDAR\n'
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


    it('should modify event when asked', async () => {
        await new Promise(r => sut.eventSubject.pipe(take(1)).subscribe(events => {
            expect(events.length).toBe(1, '1 event loaded');
            const event = events[0];
            event.title = 'Changed!';
            sut.modifyEvent(event);
            r();
        }));

        await new Promise(r => sut.eventSubject.pipe(take(1)).subscribe(events => {
            expect(events.length).toBe(1, '1 event loaded');
            const event = events[0];
            expect(event.title).toBe('Changed!', 'event got updated');

            expect(calls.modifyCalendarEvent).toBe(1, '1 modification performed in the API');
            expect(calls.addCalendarEvent   ).toBe(0, 'no events were added');
            expect(calls.deleteCalendarEvent).toBe(0, 'no events were deleted');
            r();
        }));
    });

    it('should be able to move events between calendars', async () => {
        await new Promise(r => sut.eventSubject.pipe(take(1)).subscribe(events => {
            expect(events.length).toBe(1, '1 event loaded');
            // FIXME?
            // const event = events[0].clone();
            events[0].calendar = 'test2';
            sut.modifyEvent(events[0]);
            r();
        }));

        await new Promise(r => sut.eventSubject.pipe(take(1)).subscribe(events => {
            expect(events.length).toBe(1, '1 event loaded');
            const event = events[0];
            expect(event.calendar).toBe('test2', 'event got moved');

            expect(calls.modifyCalendarEvent).toBe(0, 'no modifications performed in the API');
            expect(calls.addCalendarEvent   ).toBe(1, '1 event was added');
            expect(calls.deleteCalendarEvent).toBe(1, '1 event was deleted');
            r();
        }));
    });
});
