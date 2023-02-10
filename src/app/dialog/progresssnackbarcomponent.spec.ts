// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2019 Runbox Solutions AS (runbox.com).
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

import { TestBed, ComponentFixture, tick, fakeAsync, waitForAsync } from '@angular/core/testing';
import { DialogModule } from './dialog.module';
import { ProgressSnackbarComponent } from './progresssnackbar.component';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Component } from '@angular/core';

@Component({
    template: 'test'
}) export class TestAppComponent {}

describe('ProgressService', () => {
    let fixture: ComponentFixture<TestAppComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [
                NoopAnimationsModule,
                DialogModule],
            declarations: [TestAppComponent]
        }).compileComponents();
        fixture = TestBed.createComponent(TestAppComponent);
    }));

    it('should see changes in the progress snackbar', fakeAsync(() => {
        const snackbar: MatSnackBar = TestBed.inject(MatSnackBar);

        expect(snackbar.openFromComponent).toBeDefined();

        const comp = ProgressSnackbarComponent.create(snackbar);
        fixture.detectChanges();

        comp.postMessage('Test1');
        tick(1000);
        fixture.detectChanges();

        let snackbarElement: HTMLElement;
        document.querySelectorAll('snack-bar-container').forEach((e: HTMLElement) => {
            if (e.innerText.indexOf('Test1') > -1) {
                snackbarElement = e;
            }
        });

        expect(snackbarElement.innerText.trim()).toBe('Test1');
        comp.postMessage('Test2');
        tick(1000);
        fixture.detectChanges();

        expect(snackbarElement.innerText.trim()).toBe('Test2');
        comp.close();
        fixture.detectChanges();
        tick(2000);
        fixture.detectChanges();

        snackbarElement = null;
        document.querySelectorAll('snack-bar-container').forEach((e: HTMLElement) => {
            if (e.innerText.indexOf('Test2') > -1) {
                snackbarElement = e;
            }
        });
        expect(snackbarElement).toBeNull();
    }));
});
