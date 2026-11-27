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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import moment from 'moment';

import { CalendarEventCardComponent } from './calendar-event-card.component';
import { MOMENT_FORMATS } from './calendar-app.module';
import { EventOverview } from './event-overview';

describe('calendar date formatting', () => {
    describe('date-time picker formats', () => {
        it('uses unambiguous ISO-style date and time formats', () => {
            expect(MOMENT_FORMATS.parseInput).toBe('YYYY-MM-DD HH:mm');
            expect(MOMENT_FORMATS.fullPickerInput).toBe('YYYY-MM-DD HH:mm');
            expect(MOMENT_FORMATS.datePickerInput).toBe('YYYY-MM-DD');
            expect(MOMENT_FORMATS.timePickerInput).toBe('HH:mm');
        });
    });

    describe('CalendarEventCardComponent', () => {
        let component: CalendarEventCardComponent;
        let fixture: ComponentFixture<CalendarEventCardComponent>;

        beforeEach(async () => {
            await TestBed.configureTestingModule({
                declarations: [CalendarEventCardComponent],
                imports: [
                    MatButtonModule,
                    MatCardModule,
                ],
            }).compileComponents();

            fixture = TestBed.createComponent(CalendarEventCardComponent);
            component = fixture.componentInstance;
        });

        it('renders event dates with ISO-style date and 24-hour time', () => {
            component.event = new EventOverview(
                'Deployment window',
                moment('2031-11-12T09:05:00'),
                moment('2031-11-12T10:35:00'),
            );

            fixture.detectChanges();

            const text = fixture.nativeElement.textContent;
            expect(text).toContain('Starts');
            expect(text).toContain('2031-11-12 09:05');
            expect(text).toContain('Ends 2031-11-12 10:35');
        });
    });
});
