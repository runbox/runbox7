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

import { CalendarSettings } from './calendar-settings';
import { EventEditorDialogComponent } from './event-editor-dialog.component';
import { RunboxCalendar } from './runbox-calendar';
import { RunboxCalendarEvent } from './runbox-calendar-event';

describe('EventEditorDialogComponent', () => {
    function createComponent(): EventEditorDialogComponent {
        return new EventEditorDialogComponent(
            {} as any,
            { close: jasmine.createSpy('close') } as any,
            {
                calendars: [new RunboxCalendar({ id: 'test-calendar', displayname: 'Test Calendar' })],
                event: RunboxCalendarEvent.newEmpty(),
                is_new: true,
                settings: new CalendarSettings({}),
                start: new Date(2026, 0, 10),
            }
        );
    }

    it('should shift the end time by the same amount when the start time changes', () => {
        const component = createComponent();
        component.event_start = new Date(2026, 0, 10, 8, 0);
        component.event_end = new Date(2026, 0, 10, 9, 30);

        component.updateStart(new Date(2026, 0, 10, 7, 0));

        expect(component.event_end).toEqual(new Date(2026, 0, 10, 8, 30));
    });

    it('should keep the event duration when the start date changes', () => {
        const component = createComponent();
        component.event_start = new Date(2026, 0, 10, 8, 0);
        component.event_end = new Date(2026, 0, 10, 9, 30);

        component.updateStart(new Date(2026, 0, 11, 8, 0));

        expect(component.event_end).toEqual(new Date(2026, 0, 11, 9, 30));
    });
});
