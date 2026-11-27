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
import { of } from 'rxjs';

import { CreditCardsComponent } from './credit-cards.component';
import { RunboxWebmailAPI } from '../../rmmapi/rbwebmail';
import { RunboxContactSupportSnackBar } from '../../common/contact-support-snackbar.service';
import { MatDialog } from '@angular/material/dialog';

describe('CreditCardsComponent', () => {
    let fixture: ComponentFixture<CreditCardsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CreditCardsComponent],
            providers: [
                { provide: MatDialog, useValue: { open: jasmine.createSpy('open') } },
                {
                    provide: RunboxWebmailAPI,
                    useValue: {
                        getCreditCards: () => of({ payment_methods: [], default: null }),
                    },
                },
                { provide: RunboxContactSupportSnackBar, useValue: { open: jasmine.createSpy('open') } },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CreditCardsComponent);
        fixture.detectChanges();
    });

    it('describes card handling without naming Stripe', () => {
        const text = fixture.nativeElement.textContent;

        expect(text).toContain('handled securely through our card payment provider');
        expect(text).not.toContain('Stripe');
    });
});
