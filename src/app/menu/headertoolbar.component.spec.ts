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
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { HeaderToolbarComponent } from './headertoolbar.component';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { RMMOfflineService } from '../rmmapi/rmmoffline.service';
import { LogoutService } from '../login/logout.service';

describe('HeaderToolbarComponent', () => {
    let fixture: ComponentFixture<HeaderToolbarComponent>;
    let component: HeaderToolbarComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [HeaderToolbarComponent],
            imports: [RouterTestingModule],
            providers: [
                {
                    provide: RunboxWebmailAPI,
                    useValue: {
                        me: of({
                            username: 'alice',
                            is_trial: false,
                            owner: null,
                        }),
                    },
                },
                {
                    provide: RMMOfflineService,
                    useValue: {
                        is_offline: false,
                    },
                },
                {
                    provide: LogoutService,
                    useValue: {
                        logout: jasmine.createSpy('logout'),
                    },
                },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(HeaderToolbarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should display the logged-in username in the app header', () => {
        const usernameElement = fixture.nativeElement.querySelector('[data-testid="header-username"]');

        expect(component.username).toBe('alice');
        expect(usernameElement?.textContent).toContain('alice');
    });
});
