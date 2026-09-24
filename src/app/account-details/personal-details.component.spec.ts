// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2019 Runbox Solutions AS (runbox.com).
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
import { HttpClient } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { of } from 'rxjs';
import { RMM } from '../rmm';
import { PersonalDetailsComponent } from './personal-details.component';

describe('PersonalDetailsComponent', () => {
    let component: PersonalDetailsComponent;
    let fixture: ComponentFixture<PersonalDetailsComponent>;
    let httpClient: jasmine.SpyObj<HttpClient>;
    let rmm: { account_security: { user_password: string }, show_error: jasmine.Spy };

    beforeEach(async () => {
        httpClient = jasmine.createSpyObj<HttpClient>('HttpClient', ['get', 'post']);
        httpClient.get.withArgs('/rest/v1/timezones').and.returnValue(
            of({ result: { timezones: ['Europe/Oslo'] } })
        );
        httpClient.get.withArgs('/rest/v1/account/details').and.returnValue(
            of({
                result: {
                    first_name: 'Existing',
                    last_name: 'User',
                    email_alternative: 'alt@example.com',
                    email_alternative_status: 0,
                    phone_number: null,
                    company: '',
                    org_number: null,
                    vat_number: '',
                    street_address: '',
                    city: '',
                    postal_code: '',
                    country: 'NO',
                    timezone: 'Europe/Oslo',
                },
            })
        );
        httpClient.get.and.returnValue(of({ result: {} }));
        httpClient.post.and.returnValue(of({ result: { email_alternative: 'alt@example.com' } }));

        rmm = {
            account_security: { user_password: 'correct horse battery staple' },
            show_error: jasmine.createSpy('show_error'),
        };

        await TestBed.configureTestingModule({
            declarations: [PersonalDetailsComponent],
            imports: [CommonModule, NoopAnimationsModule, ReactiveFormsModule],
            providers: [
                { provide: HttpClient, useValue: httpClient },
                { provide: MatDialog, useValue: { open: jasmine.createSpy('open') } },
                { provide: RMM, useValue: rmm },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();

        fixture = TestBed.createComponent(PersonalDetailsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('accepts letters with common name separators', () => {
        const allowedNames = ['Anne-Marie', 'O\'Connor', 'Élodie', 'van der Meer'];

        for (const name of allowedNames) {
            const firstNameControl = component.detailsForm.get('first_name');
            firstNameControl.setValue(name);
            expect(firstNameControl.valid).withContext(name).toBeTrue();
        }
    });

    it('rejects url-like or punctuated names', () => {
        const rejectedNames = ['domain.tld', 'http://runbox.com', 'foo@bar.com', 'name/with/slash'];

        for (const name of rejectedNames) {
            const firstNameControl = component.detailsForm.get('first_name');
            firstNameControl.setValue(name);
            expect(firstNameControl.hasError('invalidName')).withContext(name).toBeTrue();
        }
    });

    it('normalizes valid names before submitting account details', () => {
        component.detailsForm.get('first_name').setValue('  Anne   Marie  ');
        component.detailsForm.get('last_name').setValue('  O\'Connor  ');
        component.detailsForm.get('first_name').markAsDirty();
        component.detailsForm.get('last_name').markAsDirty();

        component.update();

        expect(httpClient.post).toHaveBeenCalledWith(
            '/rest/v1/account/details',
            jasmine.objectContaining({
                first_name: 'Anne Marie',
                last_name: 'O\'Connor',
                password: 'correct horse battery staple',
            })
        );
    });

    it('does not submit invalid names', () => {
        component.detailsForm.get('first_name').setValue('domain.tld');
        component.detailsForm.get('last_name').setValue('Valid');

        component.update();

        expect(httpClient.post).not.toHaveBeenCalled();
        expect(component.detailsForm.get('first_name').touched).toBeTrue();
        expect(rmm.show_error).toHaveBeenCalledWith('Please correct the highlighted fields', 'Dismiss');
    });
});
