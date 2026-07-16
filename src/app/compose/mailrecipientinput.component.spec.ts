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

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatLegacyAutocomplete as MatAutocomplete, MatLegacyAutocompleteModule } from '@angular/material/legacy-autocomplete';
import { MatLegacyChipInputEvent as MatChipInputEvent, MatLegacyChipsModule } from '@angular/material/legacy-chips';
import { MatLegacyFormFieldModule } from '@angular/material/legacy-form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyInputModule } from '@angular/material/legacy-input';
import { MatLegacySnackBarModule } from '@angular/material/legacy-snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MailRecipientInputComponent } from './mailrecipientinput.component';
import { RecipientsService } from './recipients.service';

describe('MailRecipientInputComponent', () => {
    let component: MailRecipientInputComponent;
    let fixture: ComponentFixture<MailRecipientInputComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                MatLegacyAutocompleteModule,
                MatLegacyChipsModule,
                MatLegacyFormFieldModule,
                MatIconModule,
                MatLegacyInputModule,
                MatLegacySnackBarModule,
                NoopAnimationsModule,
                ReactiveFormsModule,
            ],
            declarations: [
                MailRecipientInputComponent,
            ],
            providers: [
                { provide: RecipientsService, useValue: { recipients: of([]) } },
            ],
        });

        fixture = TestBed.createComponent(MailRecipientInputComponent);
        component = fixture.componentInstance;
        component.recipients = [];
        component.ngOnChanges();
        fixture.detectChanges();
    });

    function textInput(): HTMLInputElement {
        return fixture.nativeElement.querySelector('input');
    }

    it('turns a typed address into a recipient chip after blur', fakeAsync(() => {
        const input = textInput();

        component.auto = { isOpen: true } as MatAutocomplete;
        input.value = 'person@example.com';
        input.dispatchEvent(new Event('blur'));
        tick();

        expect(component.recipientsList.length).toBe(1);
        expect(component.recipientsList[0].address).toBe('person@example.com');
        expect(input.value).toBe('');
        expect(component.invalidemail).toBe(false);
    }));

    it('can force a pending typed address into a recipient before send validation', () => {
        const input = textInput();

        component.addedFromAutoComplete = true;
        input.value = 'typed@example.com';
        component.commitPendingRecipient(true);

        expect(component.recipientsList.length).toBe(1);
        expect(component.recipientsList[0].address).toBe('typed@example.com');
        expect(input.value).toBe('');
        expect(component.addedFromAutoComplete).toBe(false);
    });

    it('does not add an Enter token while autocomplete is open', () => {
        const input = textInput();

        component.auto = { isOpen: true } as MatAutocomplete;
        input.value = 'typed@example.com';
        component.addRecipientFromEnter({ input } as MatChipInputEvent);

        expect(component.recipientsList.length).toBe(0);
        expect(input.value).toBe('typed@example.com');
    });
});
