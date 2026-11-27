// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2021 Runbox Solutions AS (runbox.com).
//
// This file is part of Runbox 7.
//
// Runbox 7 is free software: You can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the
// Free Software Foundation, either version 3 of the License, or (at your
// option) any later version.
//
// Runbox 7 is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
// General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Runbox 7. If not, see <https://www.gnu.org/licenses/>.
// ---------- END RUNBOX LICENSE ----------

import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { MatLegacyTooltipModule as MatTooltipModule, MatLegacyTooltip as MatTooltip } from '@angular/material/legacy-tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatExpansionModule } from '@angular/material/expansion';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';

import { AccountAppComponent } from './account-app.component';
import { CartService } from './cart.service';
import { MobileQueryService } from '../mobile-query.service';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';

describe('AccountAppComponent', () => {
    let component: AccountAppComponent;
    let fixture: ComponentFixture<AccountAppComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [
                AccountAppComponent,
            ],
            imports: [
                CommonModule,
                MatBadgeModule,
                MatButtonModule,
                MatExpansionModule,
                MatListModule,
                MatTooltipModule,
                NoopAnimationsModule,
                RouterTestingModule,
            ],
            providers: [
                { provide: CartService, useValue: {
                    items: of([]),
                } },
                { provide: MobileQueryService, useValue: {
                    matches: false,
                } },
                { provide: RunboxWebmailAPI, useValue: {
                    me: of({ owner: false }),
                } },
            ],
            schemas: [
                NO_ERRORS_SCHEMA,
            ],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(AccountAppComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('places legacy Runbox 6 sidebar tooltips to the right of menu items', () => {
        const tooltips = fixture.debugElement
            .queryAll(By.directive(MatTooltip))
            .map(element => element.injector.get(MatTooltip))
            .filter(tooltip => tooltip.message === component.rmm6tooltip);

        expect(tooltips.length).toBe(7);
        expect(tooltips.every(tooltip => tooltip.position === 'right')).toBeTrue();
    });
});
