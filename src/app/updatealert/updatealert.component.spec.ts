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

import { Component } from '@angular/core';
import { ComponentFixture, fakeAsync, flush, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { SwUpdate } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { UpdateAlertComponent } from './updatealert.component';
import { UpdateAlertModule } from './updatealert.module';

@Component({
    template: 'test'
})
class TestAppComponent {}

describe('UpdateAlertComponent', () => {
    let fixture: ComponentFixture<TestAppComponent>;
    let snackbar: MatSnackBar;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [
                NoopAnimationsModule,
                UpdateAlertModule
            ],
            declarations: [TestAppComponent],
            providers: [
                {
                    provide: SwUpdate,
                    useValue: {
                        isEnabled: false,
                        versionUpdates: new Subject(),
                        checkForUpdate: () => Promise.resolve(false),
                    }
                }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(TestAppComponent);
        snackbar = TestBed.inject(MatSnackBar);
    }));

    it('opens as a non-modal snackbar with update details', fakeAsync(() => {
        const snackbarRef = snackbar.openFromComponent(UpdateAlertComponent, {
            data: {
                current: { hash: 'old-version', appData: { build_epoch: '1000' } },
                available: { hash: 'new-version', appData: { commit: 'abc1234', build_time: '2026-06-10' } },
            }
        });

        fixture.detectChanges();
        tick();

        const snackbarElement = document.querySelector('snack-bar-container') as HTMLElement;

        expect(snackbarElement).not.toBeNull();
        expect(snackbarElement.innerText).toContain('An update of the application is available');
        expect(snackbarElement.innerText).toContain('abc1234');
        expect(snackbarElement.innerText).toContain('Reload now');
        expect(snackbarElement.innerText).toContain('Later');
        expect(document.querySelector('mat-dialog-container')).toBeNull();

        snackbarRef.dismiss();
        flush();
    }));
});
