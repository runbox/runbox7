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
import { ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatLegacyAutocomplete as MatAutocomplete, MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete';
import { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { BehaviorSubject, of } from 'rxjs';

import { MailAddressInfo } from '../common/mailaddressinfo';
import { MailRecipientInputComponent } from './mailrecipientinput.component';
import { Recipient } from './recipient';
import { RecipientsService } from './recipients.service';

class MockRecipientsService {
    recipients = new BehaviorSubject<Recipient[]>([
        new Recipient(['"Alice Example" <alice.long.address@example.com>'])
    ]);
}

class MockSnackBar {
    open() {
        return {
            onAction: () => of(undefined)
        };
    }
}

describe('MailRecipientInputComponent', () => {
    let fixture: ComponentFixture<MailRecipientInputComponent>;
    let component: MailRecipientInputComponent;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                MatAutocompleteModule,
                MatChipsModule,
                MatFormFieldModule,
                MatIconTestingModule,
                MatInputModule,
                NoopAnimationsModule,
                ReactiveFormsModule
            ],
            declarations: [
                MailRecipientInputComponent
            ],
            providers: [
                { provide: RecipientsService, useClass: MockRecipientsService },
                { provide: MatSnackBar, useClass: MockSnackBar }
            ]
        });

        fixture = TestBed.createComponent(MailRecipientInputComponent);
        component = fixture.componentInstance;
        component.placeholder = 'To';
        component.recipients = [
            MailAddressInfo.parse('"A very long display name" <very.long.address@example.com>')[0]
        ];
        component.ngOnChanges();
        fixture.detectChanges();
    });

    it('uses a viewport-aware autocomplete panel width for mobile selection', () => {
        const autocomplete = fixture.debugElement.query(By.directive(MatAutocomplete)).componentInstance as MatAutocomplete;

        expect((component as any).autocompletePanelWidth).toBe('min(95vw, 520px)');
        expect(autocomplete.panelWidth).toBe('min(95vw, 520px)');
    });

    it('marks long recipient chips and the search input with responsive classes', () => {
        const chip = fixture.debugElement.query(By.css('mat-chip'));
        const chipLabel = fixture.debugElement.query(By.css('.recipient-chip-label'));
        const input = fixture.debugElement.query(By.css('input'));

        expect(chip.nativeElement.classList).toContain('recipient-chip');
        expect(chipLabel.nativeElement.textContent).toContain('very.long.address@example.com');
        expect(input.nativeElement.classList).toContain('recipient-search-input');
    });
});
