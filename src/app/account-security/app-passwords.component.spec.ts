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

import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';

import { AppPasswordsComponent } from './app-passwords.component';
import { MobileQueryService } from '../mobile-query.service';
import { RMM } from '../rmm';

describe('AppPasswordsComponent', () => {
    let fixture: ComponentFixture<AppPasswordsComponent>;

    type RmmMock = {
        me: {
            load: jasmine.Spy;
        };
        account_security: {
            user_password: string;
            tfa: {
                get: jasmine.Spy;
                settings: {
                    is_app_pass_enabled: boolean;
                };
            };
            app_pass: {
                list: jasmine.Spy;
                create: jasmine.Spy;
                update: jasmine.Spy;
                is_busy: boolean;
                password: Record<string, string>;
                results: unknown[];
            };
        };
    };

    let rmmMock: RmmMock;

    beforeEach(async () => {
        rmmMock = {
            me: {
                load: jasmine.createSpy('load'),
            },
            account_security: {
                user_password: 'secret',
                tfa: {
                    get: jasmine.createSpy('get'),
                    settings: {
                        is_app_pass_enabled: true,
                    },
                },
                app_pass: {
                    list: jasmine.createSpy('list'),
                    create: jasmine.createSpy('create').and.returnValue(of({ status: 'ok' })),
                    update: jasmine.createSpy('update').and.returnValue(of({ status: 'ok' })),
                    is_busy: false,
                    password: {},
                    results: [],
                },
            },
        };

        await TestBed.configureTestingModule({
            declarations: [AppPasswordsComponent],
            imports: [CommonModule, FormsModule],
            providers: [
                { provide: RMM, useValue: rmmMock },
                { provide: MatSnackBar, useValue: { open: jasmine.createSpy('open') } },
                {
                    provide: MatDialog,
                    useValue: { open: jasmine.createSpy('open').and.returnValue({ afterClosed: () => of(null) }) },
                },
                { provide: MobileQueryService, useValue: { matches: false } },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();

        fixture = TestBed.createComponent(AppPasswordsComponent);
    });

    it('shows a warning when the main app password switch is disabled', () => {
        rmmMock.account_security.tfa.settings.is_app_pass_enabled = false;

        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('App Passwords are currently disabled.');
        expect(fixture.nativeElement.textContent)
            .toContain('New app passwords will not work until you enable the main switch above.');
    });

    it('does not show the warning when app passwords are enabled', () => {
        rmmMock.account_security.tfa.settings.is_app_pass_enabled = true;

        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).not.toContain('App Passwords are currently disabled.');
    });
});
