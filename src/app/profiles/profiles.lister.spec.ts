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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Subject } from 'rxjs';
import { MobileQueryService, ScreenSize } from '../mobile-query.service';
import { ProfilesListerComponent } from './profiles.lister';

class MockMobileQueryService {
    screenSize = ScreenSize.Desktop;
    screenSizeChanged: Subject<ScreenSize> = new Subject();
}

describe('ProfilesListerComponent', () => {
    let fixture: ComponentFixture<ProfilesListerComponent>;
    let component: ProfilesListerComponent;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [
                ProfilesListerComponent,
            ],
            imports: [
                MatButtonModule,
                MatCardModule,
                MatDividerModule,
                MatGridListModule,
                NoopAnimationsModule,
            ],
            providers: [
                { provide: MatDialog, useValue: { open: () => ({}) } },
                { provide: MatSnackBar, useValue: { open: () => ({}) } },
                { provide: MobileQueryService, useClass: MockMobileQueryService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ProfilesListerComponent);
        component = fixture.componentInstance;
    });

    it('shows identity details without rendering the signature preview', () => {
        component.profiles = [{
            email: 'sender@example.com',
            from_name: 'Sender Name',
            reference: {},
            reference_type: 'preference',
            reply_to: 'reply@example.com',
            signature: '<p>HTML signature</p>',
            type: 'external_email',
        }];

        fixture.detectChanges();

        const profileText = fixture.nativeElement.textContent;
        expect(profileText).toContain('sender@example.com');
        expect(profileText).toContain('Sender Name');
        expect(profileText).toContain('reply@example.com');
        expect(profileText).not.toContain('Signature:');
        expect(profileText).not.toContain('<p>HTML signature</p>');
    });
});
