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
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { BehaviorSubject } from 'rxjs';

import { DefaultProfileComponent } from './profiles.default';
import { Identity, ProfileService } from './profile.service';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';

describe('DefaultProfileComponent', () => {
    let fixture: ComponentFixture<DefaultProfileComponent>;
    let component: DefaultProfileComponent;

    const profiles$ = new BehaviorSubject<Identity[]>([]);
    const validProfiles$ = new BehaviorSubject<Identity[]>([]);

    const mockProfileService = {
        profiles: profiles$,
        validProfiles: validProfiles$,
        composeProfile: null,
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DefaultProfileComponent],
            imports: [CommonModule, FormsModule],
            providers: [
                { provide: ProfileService, useValue: mockProfileService },
                { provide: RunboxWebmailAPI, useValue: {} },
                { provide: MatSnackBar, useValue: { open: () => undefined } },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(DefaultProfileComponent);
        component = fixture.componentInstance;

        const profiles = [
            Identity.fromObject({
                id: 1,
                email: 'alice@example.com',
                from_name: 'Alice Example',
            }),
            Identity.fromObject({
                id: 2,
                email: 'bob@example.com',
                from_name: 'Bob Example',
            }),
        ];

        component.validProfiles = profiles;
        component.selectedProfile = profiles[0];
        mockProfileService.composeProfile = profiles[0];
        profiles$.next(profiles);
        validProfiles$.next(profiles);

        fixture.detectChanges();
    });

    it('should not apply the lowercase-only identity option class', () => {
        const option = fixture.nativeElement.querySelector('mat-option');

        expect(option.classList.contains('identity-profile')).toBeFalse();
        expect(option.textContent).toContain('Alice Example <alice@example.com>');
    });
});
