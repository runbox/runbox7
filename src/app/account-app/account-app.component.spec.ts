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
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';

import { AccountAppComponent } from './account-app.component';
import { CartService } from './cart.service';
import { MobileQueryService } from '../mobile-query.service';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { RunboxSidenavService } from '../runbox-components/runbox-sidenav.service';

@Component({
    selector: 'app-runbox-container',
    template: '<ng-content select="nav"></ng-content><ng-content select="[toolbar]"></ng-content><ng-content></ng-content>',
})
class RunboxContainerStubComponent {}

describe('AccountAppComponent', () => {
    let fixture: ComponentFixture<AccountAppComponent>;
    let mobileQuery: MobileQueryService;
    let sidenavService: jasmine.SpyObj<RunboxSidenavService>;

    beforeEach(async () => {
        sidenavService = jasmine.createSpyObj('RunboxSidenavService', ['toggleSidenav']);

        await TestBed.configureTestingModule({
            imports: [
                RouterTestingModule.withRoutes([]),
                MatBadgeModule,
                MatButtonModule,
                MatIconModule,
                MatIconTestingModule,
                MatTooltipModule,
            ],
            declarations: [
                AccountAppComponent,
                RunboxContainerStubComponent,
            ],
            providers: [
                { provide: CartService, useValue: { items: of([]) } },
                { provide: MobileQueryService, useValue: { matches: true } },
                { provide: RunboxSidenavService, useValue: sidenavService },
                { provide: RunboxWebmailAPI, useValue: { me: of({ owner: null }) } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AccountAppComponent);
        mobileQuery = TestBed.inject(MobileQueryService);
    });

    it('shows the mobile settings toggle on mobile screens', () => {
        mobileQuery.matches = true;
        fixture.detectChanges();

        const toggleButton = fixture.nativeElement.querySelector('#toggleFolderPaneIcon');
        expect(toggleButton).toBeTruthy();
        expect(toggleButton.getAttribute('aria-label')).toBe('Toggle settings menu');
    });

    it('hides the mobile settings toggle on desktop screens', () => {
        mobileQuery.matches = false;
        fixture.detectChanges();

        const toggleButton = fixture.nativeElement.querySelector('#toggleFolderPaneIcon');
        expect(toggleButton).toBeNull();
    });

    it('toggles the settings navigation when the mobile button is clicked', () => {
        mobileQuery.matches = true;
        fixture.detectChanges();

        fixture.debugElement.query(By.css('#toggleFolderPaneIcon')).nativeElement.click();

        expect(sidenavService.toggleSidenav).toHaveBeenCalled();
    });
});
