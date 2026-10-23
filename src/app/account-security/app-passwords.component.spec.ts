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

import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacySlideToggleModule as MatSlideToggleModule } from '@angular/material/legacy-slide-toggle';
import { MatLegacySnackBar as MatSnackBar, MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MobileQueryService } from '../mobile-query.service';
import { RMM } from '../rmm';
import { RunboxComponentModule } from '../runbox-components/runbox-component.module';
import { AppPasswordsComponent } from './app-passwords.component';

describe('AppPasswordsComponent', () => {
    let component: AppPasswordsComponent;
    let fixture: ComponentFixture<AppPasswordsComponent>;
    let clipboard: Clipboard;
    let snackBar: MatSnackBar;

    beforeEach(async () => {
        const rmmMock = {
            me: {
                load: jasmine.createSpy('load'),
            },
            account_security: {
                user_password: 'main-account-password',
                tfa: {
                    settings: {
                        is_app_pass_enabled: 1,
                    },
                    get: jasmine.createSpy('get'),
                },
                app_pass: {
                    is_busy: false,
                    results: [
                        { id: 1, name: 'Thunderbird', is_enabled: 1 },
                        { id: 2, name: 'Android Mail', is_enabled: 1 },
                    ],
                    password: {
                        Thunderbird: 'secret-app-pass-123',
                    },
                    list: jasmine.createSpy('list'),
                    create: jasmine.createSpy('create').and.returnValue(of({ status: 'success' })),
                    update: jasmine.createSpy('update').and.returnValue(of({ status: 'success' })),
                },
            },
        };

        const mobileQueryMock = {
            matches: false,
        };

        await TestBed.configureTestingModule({
            imports: [
                ClipboardModule,
                CommonModule,
                FormsModule,
                MatButtonModule,
                MatDialogModule,
                MatFormFieldModule,
                MatIconModule,
                MatIconTestingModule,
                MatInputModule,
                MatSlideToggleModule,
                MatSnackBarModule,
                MatTableModule,
                MatTooltipModule,
                NoopAnimationsModule,
                RunboxComponentModule,
            ],
            declarations: [AppPasswordsComponent],
            providers: [
                { provide: RMM, useValue: rmmMock },
                { provide: MobileQueryService, useValue: mobileQueryMock },
            ],
        }).compileComponents();

        clipboard = TestBed.inject(Clipboard);
        snackBar = TestBed.inject(MatSnackBar);
        fixture = TestBed.createComponent(AppPasswordsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    // Newly generated app passwords must render without surrounding spaces and provide a copy button (#2017).
    it('renders newly created app password without whitespace and copies it on button click', () => {
        expect(component).toBeTruthy();
        const copySpy = spyOn(clipboard, 'copy').and.returnValue(true);
        const snackBarSpy = spyOn(snackBar, 'open');

        const passwordStrong = fixture.nativeElement.querySelector('td.mat-column-password strong');
        expect(passwordStrong).toBeTruthy();
        expect(passwordStrong.textContent).toBe('secret-app-pass-123');

        const copyButtons = fixture.nativeElement.querySelectorAll('td.mat-column-password button.copyAppPasswordButton');
        expect(copyButtons.length).toBe(1);

        copyButtons[0].click();
        fixture.detectChanges();

        expect(copySpy).toHaveBeenCalledOnceWith('secret-app-pass-123');
        expect(snackBarSpy).toHaveBeenCalledWith('App password copied to clipboard.', 'Dismiss', { duration: 2000 });
    });
});
