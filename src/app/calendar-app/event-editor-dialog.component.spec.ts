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
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Runbox 7. If not, see <https://www.gnu.org/licenses/>.
// ---------- END RUNBOX LICENSE ----------

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ErrorHandler } from '@angular/core';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HarnessLoader } from '@angular/cdk/testing';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { MatLegacySelectHarness } from '@angular/material/legacy-select/testing';
import { MatLegacyTabGroupHarness } from '@angular/material/legacy-tabs/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { CalendarAppModule } from './calendar-app.module';
import { CalendarSettings } from './calendar-settings';
import { EventEditorDialogComponent } from './event-editor-dialog.component';
import { RunboxCalendar } from './runbox-calendar';
import { RunboxCalendarEvent } from './runbox-calendar-event';

describe('EventEditorDialogComponent', () => {
    let component: EventEditorDialogComponent;
    let fixture: ComponentFixture<EventEditorDialogComponent>;
    let loader: HarnessLoader;

    async function selectWithValueText(text: string): Promise<MatLegacySelectHarness> {
        const selects = await loader.getAllHarnesses(MatLegacySelectHarness);
        for (const select of selects) {
            if ((await select.getValueText()).trim() === text) {
                return select;
            }
        }
        throw new Error(`Select with value text "${text}" not found`);
    }

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [
                CalendarAppModule,
                NoopAnimationsModule,
            ],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: {
                    calendars: [
                        new RunboxCalendar({
                            id: 'test-calendar',
                            displayname: 'Test Calendar',
                            color: 'pink',
                            syncToken: 'testsync',
                        }),
                    ],
                    event: RunboxCalendarEvent.newEmpty('Europe/London'),
                    is_new: true,
                    settings: new CalendarSettings({}),
                } },
                { provide: MatDialog, useValue: {
                    open: () => ({
                        afterClosed: () => of(false),
                    }),
                } },
                { provide: MatDialogRef, useValue: {
                    close: () => undefined,
                } },
                { provide: ErrorHandler, useValue: {
                    handleError: () => undefined,
                } },
            ],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(EventEditorDialogComponent);
        component = fixture.componentInstance;
        loader = TestbedHarnessEnvironment.loader(fixture);
        spyOn(console, 'log');
        fixture.detectChanges();
    });

    it('should display changed monthly recurrence selector values', async () => {
        component.event_recurs = true;
        component.recurring_frequency = 'MONTHLY';
        component.recur_by_monthyeardays = ['1'];
        component.recur_by_weekdays = ['day'];
        fixture.detectChanges();

        const tabs = await loader.getHarness(MatLegacyTabGroupHarness);
        await tabs.selectTab({ label: 'Recurrence' });

        const nthSelect = await selectWithValueText('1st');
        expect((await (await nthSelect.host()).getDimensions()).width).toBeGreaterThan(70);
        await nthSelect.clickOptions({ text: '2nd' });
        expect(component.recur_by_monthyeardays).toEqual(['1', '2']);
        expect(await nthSelect.getValueText()).toContain('2nd');

        const weekdaySelect = await selectWithValueText('day');
        expect((await (await weekdaySelect.host()).getDimensions()).width).toBeGreaterThan(90);
        await weekdaySelect.clickOptions({ text: 'Monday' });
        expect(component.recur_by_weekdays).toEqual(['MO']);
        expect(await weekdaySelect.getValueText()).toContain('Monday');
    });
});
