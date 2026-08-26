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
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { DialogModule } from './dialog.module';
import { ProgressDialog } from './progress.dialog';

describe('ProgressDialog', () => {
    let fixture: ComponentFixture<ProgressDialog>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [
                NoopAnimationsModule,
                DialogModule
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ProgressDialog);
    }));

    it('shows an indeterminate spinner before progress is available', () => {
        fixture.detectChanges();

        expect(fixture.debugElement.query(By.css('mat-spinner'))).not.toBeNull();
        expect(fixture.debugElement.query(By.css('mat-progress-bar'))).toBeNull();
    });

    it('shows a determinate progress bar for numeric progress', () => {
        fixture.componentInstance.value = 37;

        fixture.detectChanges();

        const progressBar = fixture.debugElement.query(By.css('mat-progress-bar'));
        expect(progressBar).not.toBeNull();
        expect(progressBar.componentInstance.mode).toBe('determinate');
        expect(progressBar.componentInstance.value).toBe(37);
        expect(fixture.debugElement.query(By.css('mat-spinner'))).toBeNull();
    });

    it('treats zero as a valid progress value', () => {
        fixture.componentInstance.value = 0;

        fixture.detectChanges();

        const progressBar = fixture.debugElement.query(By.css('mat-progress-bar'));
        expect(progressBar).not.toBeNull();
        expect(progressBar.componentInstance.value).toBe(0);
        expect(fixture.debugElement.query(By.css('mat-spinner'))).toBeNull();
    });
});
