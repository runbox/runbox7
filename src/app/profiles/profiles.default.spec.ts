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
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { DefaultProfileComponent } from './profiles.default';
import { Identity, ProfileService } from './profile.service';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';

describe('DefaultProfileComponent', () => {
    let fixture: ComponentFixture<DefaultProfileComponent>;
    let component: DefaultProfileComponent;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [FormsModule],
            declarations: [DefaultProfileComponent],
            providers: [
                { provide: RunboxWebmailAPI, useValue: {} },
                { provide: MatSnackBar, useValue: { open: jasmine.createSpy('open') } },
                {
                    provide: ProfileService, useValue: {
                        profiles: of([]),
                        composeProfile: null,
                        validProfiles: { value: [] },
                    }
                },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(DefaultProfileComponent);
        component = fixture.componentInstance;
    });

    it('renders default identity options with their original casing', () => {
        const mixedCaseProfile = Identity.fromObject({
            email: 'mixed@example.com',
            from_name: 'Jane McTest',
        });

        component.validProfiles = [mixedCaseProfile];
        component.selectedProfile = mixedCaseProfile;

        fixture.detectChanges();

        const option = fixture.nativeElement.querySelector('mat-option') as HTMLElement;
        expect(option.textContent.trim()).toBe('Jane McTest <mixed@example.com>');
        expect(option.classList.contains('identity-profile')).toBeFalse();
    });
});
