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

import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatLegacySlideToggleModule as MatSlideToggleModule } from '@angular/material/legacy-slide-toggle';
import { MatLegacySnackBar as MatSnackBar, MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { AppPasswordsComponent } from './app-passwords.component';
import { MobileQueryService } from '../mobile-query.service';
import { RMM } from '../rmm';

describe('AppPasswordsComponent (#2017)', () => {
    let component: AppPasswordsComponent;
    let fixture: ComponentFixture<AppPasswordsComponent>;
    let clipboard: Clipboard;
    let snackBar: MatSnackBar;

    const mockRmm = {
        me: { load: () => undefined },
        account_security: {
            user_password: 'secret',
            tfa: {
                get: () => undefined,
                settings: { is_app_pass_enabled: true },
            },
            app_pass: {
                list: () => undefined,
                is_busy: false,
                results: [{ id: 1, name: 'Thunderbird', is_enabled: true }],
                password: { Thunderbird: '  abcd-1234-efgh-5678  ' },
            },
        },
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                NoopAnimationsModule,
                FormsModule,
                ClipboardModule,
                MatDialogModule,
                MatSlideToggleModule,
                MatSnackBarModule,
                MatTableModule,
                MatTooltipModule,
                MatIconModule,
                MatIconTestingModule,
            ],
            declarations: [AppPasswordsComponent],
            providers: [
                { provide: MobileQueryService, useValue: { matches: false } },
                { provide: RMM, useValue: mockRmm },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();

        fixture = TestBed.createComponent(AppPasswordsComponent);
        component = fixture.componentInstance;
        clipboard = TestBed.inject(Clipboard);
        snackBar = TestBed.inject(MatSnackBar);
        fixture.detectChanges();
    });

    it('renders a copy button that copies only the trimmed app password without HTML or spaces', () => {
        expect(component).toBeTruthy();
        const copySpy = spyOn(clipboard, 'copy').and.returnValue(true);
        const snackSpy = spyOn(snackBar, 'open');

        const copyButton = fixture.nativeElement.querySelector('button.copy-app-password-btn') as HTMLButtonElement;
        expect(copyButton).not.toBeNull();

        copyButton.click();
        fixture.detectChanges();

        expect(copySpy).toHaveBeenCalledWith('abcd-1234-efgh-5678');
        expect(snackSpy).toHaveBeenCalledWith('App password copied to clipboard.', 'Dismiss', { duration: 2000 });
    });
});
