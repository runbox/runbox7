// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2024 Runbox Solutions AS (runbox.com).
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
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatAutocomplete, MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule, MatChipInput, MatChipInputEvent } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

import { MailRecipientInputComponent } from './mailrecipientinput.component';
import { RecipientsService } from './recipients.service';

describe('MailRecipientInputComponent', () => {
    let fixture: ComponentFixture<MailRecipientInputComponent>;
    let component: MailRecipientInputComponent;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [MailRecipientInputComponent],
            imports: [
                MatAutocompleteModule,
                MatChipsModule,
                MatFormFieldModule,
                MatIconTestingModule,
                NoopAnimationsModule,
                ReactiveFormsModule
            ],
            providers: [
                {
                    provide: RecipientsService,
                    useValue: { recipients: of([]) }
                },
                {
                    provide: MatSnackBar,
                    useValue: {
                        open: () => ({ onAction: () => of(undefined) })
                    }
                }
            ]
        });

        fixture = TestBed.createComponent(MailRecipientInputComponent);
        component = fixture.componentInstance;
        component.recipients = [];
        component.ngOnChanges();
        fixture.detectChanges();
    });

    it('enables chip addition on blur', () => {
        const chipInput = fixture.debugElement.query(By.directive(MatChipInput)).injector.get(MatChipInput);
        expect(chipInput.addOnBlur).toBeTrue();
    });

    it('skips chip creation when autocomplete is open', () => {
        const input = { value: 'test@example.com' } as HTMLInputElement;
        const event = { input, value: input.value } as MatChipInputEvent;

        component.auto = { isOpen: true } as MatAutocomplete;
        spyOn(component, 'addRecipient');

        component.addRecipientFromEnter(event);

        expect(component.addRecipient).not.toHaveBeenCalled();
        expect(component.recipientsList.length).toBe(0);
        expect(component.addedFromAutoComplete).toBeFalse();
    });

    it('skips chip creation after autocomplete selection', () => {
        const input = { value: 'test@example.com' } as HTMLInputElement;
        const event = { input, value: input.value } as MatChipInputEvent;

        component.auto = { isOpen: false } as MatAutocomplete;
        component.addedFromAutoComplete = true;
        spyOn(component, 'addRecipient');

        component.addRecipientFromEnter(event);

        expect(component.addRecipient).not.toHaveBeenCalled();
        expect(component.recipientsList.length).toBe(0);
        expect(component.addedFromAutoComplete).toBeFalse();
    });

    it('adds a chip when autocomplete is closed and input is valid', () => {
        const input = { value: 'test@example.com' } as HTMLInputElement;
        const event = { input, value: input.value } as MatChipInputEvent;

        component.auto = { isOpen: false } as MatAutocomplete;

        component.addRecipientFromEnter(event);

        expect(component.recipientsList.length).toBe(1);
        expect(component.recipientsList[0].address).toBe('test@example.com');
        expect(input.value).toBe('');
        expect(component.addedFromAutoComplete).toBeFalse();
    });

    it('creates a chip on blur when input has a value', fakeAsync(() => {
        const inputEl = fixture.debugElement.query(By.css('input')).nativeElement as HTMLInputElement;
        inputEl.value = 'blur@example.com';
        inputEl.dispatchEvent(new Event('input'));
        fixture.detectChanges();

        inputEl.dispatchEvent(new Event('blur'));
        tick();
        fixture.detectChanges();

        expect(component.recipientsList.length).toBe(1);
        expect(component.recipientsList[0].address).toBe('blur@example.com');
        const chips = fixture.debugElement.queryAll(By.css('.recipient-chip'));
        expect(chips.length).toBe(1);
    }));
});
