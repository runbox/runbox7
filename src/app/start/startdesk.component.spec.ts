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

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ReplaySubject, Subject, of } from 'rxjs';
import { take } from 'rxjs/operators';
import { MatIconTestingModule } from '@angular/material/icon/testing';

import { StartDeskComponent } from './startdesk.component';
import { StartDeskModule } from './startdesk.module';
import { SearchService } from '../xapian/searchservice';
import { ProfileService } from '../profiles/profile.service';
import { UsageReportsService } from '../common/usage-reports.service';
import { PreferencesService } from '../common/preferences.service';

describe('StartDeskComponent', () => {
    let component: StartDeskComponent;
    let fixture: ComponentFixture<StartDeskComponent>;
    let preferenceService: {
        prefGroup: string;
        preferences: ReplaySubject<Map<string, any>>;
        set: jasmine.Spy;
    };

    beforeEach(waitForAsync(() => {
        preferenceService = {
            prefGroup: 'Desktop',
            preferences: new ReplaySubject<Map<string, any>>(1),
            set: jasmine.createSpy('set').and.callFake(function(this: any, level: string, key: string, entry: any) {
                preferenceService.preferences.pipe(take(1)).subscribe((prefs) => {
                    const nextPrefs = new Map(prefs);
                    nextPrefs.set(`${level}:${key}`, entry);
                    preferenceService.preferences.next(nextPrefs);
                });
            }),
        };

        TestBed.configureTestingModule({
            imports: [
                NoopAnimationsModule,
                StartDeskModule,
                MatIconTestingModule,
            ],
            providers: [
                { provide: SearchService, useValue: {
                    initSubject: new Subject<boolean>(),
                    indexReloadedSubject: new Subject<void>(),
                    getMessagesInTimeRange: () => [],
                    getDocData: () => null,
                } },
                { provide: ProfileService, useValue: {
                    validProfiles: of([]),
                } },
                { provide: UsageReportsService, useValue: {
                    report: (_: string) => { },
                } },
                { provide: PreferencesService, useValue: preferenceService },
            ],
        }).compileComponents();
    }));

    beforeEach(() => {
        preferenceService.preferences.next(new Map());
        fixture = TestBed.createComponent(StartDeskComponent);
        component = fixture.componentInstance;
    });

    it('restores saved overview settings when the component initializes', async () => {
        preferenceService.preferences.next(new Map([
            ['Desktop:overviewSettings', {
                unreadOnly: false,
                timeSpan: 3,
                folder: 2,
                sortOrder: 1,
                hiddenFolders: ['Archive'],
            }],
        ]));

        fixture.detectChanges();
        await fixture.whenStable();

        expect(component.unreadOnly).toBeFalse();
        expect(component.timeSpan).toBe(3);
        expect(component.folder).toBe(2);
        expect(component.sortOrder).toBe(1);
        expect(component.hiddenFolders.has('Archive')).toBeTrue();
    });

    it('saves current overview settings when refreshing the overview', async () => {
        fixture.detectChanges();
        await fixture.whenStable();
        preferenceService.set.calls.reset();

        component.unreadOnly = false;
        component.timeSpan = 3;
        component.folder = 2;
        component.sortOrder = 1;
        component.hiddenFolders = new Set(['Lists']);

        await component.updateCommsOverview();

        expect(preferenceService.set).toHaveBeenCalledWith('Desktop', 'overviewSettings', {
            unreadOnly: false,
            timeSpan: 3,
            folder: 2,
            sortOrder: 1,
            hiddenFolders: ['Lists'],
        });
    });
});
