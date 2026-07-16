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
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { Subject } from 'rxjs';
import { MobileQueryService, ScreenSize } from '../mobile-query.service';
import { ProfilesListerComponent } from './profiles.lister';

class MobileQueryServiceStub {
    screenSize = ScreenSize.Desktop;
    screenSizeChanged = new Subject<ScreenSize>();
}

describe('ProfilesListerComponent', () => {
    let component: ProfilesListerComponent;
    let fixture: ComponentFixture<ProfilesListerComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [
                ProfilesListerComponent,
            ],
            imports: [
                CommonModule,
            ],
            providers: [
                { provide: MatDialog, useValue: { open: jasmine.createSpy('open') } },
                { provide: MatSnackBar, useValue: { open: jasmine.createSpy('open') } },
                { provide: MobileQueryService, useClass: MobileQueryServiceStub },
            ],
            schemas: [
                NO_ERRORS_SCHEMA,
            ],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(ProfilesListerComponent);
        component = fixture.componentInstance;
        component.profiles = [{
            email: 'support@example.com',
            from_name: 'Support Team',
            name: 'Customer-facing support identity',
            reference: {},
            reference_type: 'preference',
            reply_to: 'reply@example.com',
            signature: 'Best regards',
            type: 'external_email',
        }];
    });

    it('shows the identity description in desktop overview cards', () => {
        component.mobile = false;
        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;
        expect(text).toContain('Description:');
        expect(text).toContain('Customer-facing support identity');
    });

    it('shows the identity description in mobile overview cards', () => {
        component.mobile = true;
        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;
        expect(text).toContain('Description:');
        expect(text).toContain('Customer-facing support identity');
    });
});
