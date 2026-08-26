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
import { ReactiveFormsModule, UntypedFormBuilder } from '@angular/forms';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { RMM } from '../rmm';
import { PersonalDetailsComponent } from './personal-details.component';

describe('PersonalDetailsComponent', () => {
    let fixture: ComponentFixture<PersonalDetailsComponent>;
    let component: PersonalDetailsComponent;
    let httpMock: HttpTestingController;

    const details = {
        first_name: 'Test',
        last_name: 'User',
        email_alternative: 'test@example.com',
        email_alternative_status: 0,
        phone_number: '',
        company: '',
        org_number: '',
        vat_number: '',
        street_address: '',
        city: '',
        postal_code: '',
        country: 'NO',
        timezone: 'Europe/Oslo',
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [PersonalDetailsComponent],
            imports: [
                HttpClientTestingModule,
                ReactiveFormsModule,
            ],
            providers: [
                UntypedFormBuilder,
                {
                    provide: MatDialog,
                    useValue: {
                        open: jasmine.createSpy('open'),
                    },
                },
                {
                    provide: RMM,
                    useValue: {
                        account_security: {
                            user_password: 'secret-password',
                        },
                        show_error: jasmine.createSpy('show_error'),
                    },
                },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });

        fixture = TestBed.createComponent(PersonalDetailsComponent);
        component = fixture.componentInstance;
        httpMock = TestBed.inject(HttpTestingController);

        httpMock.match('/rest/v1/account/details').forEach((req) => req.flush({
            status: 'success',
            result: details,
        }));
        httpMock.expectOne('/rest/v1/timezones').flush({
            status: 'success',
            result: {
                timezones: ['Europe/Oslo'],
            },
        });
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('does not post an unchanged alternative email address', () => {
        component.detailsForm.get('first_name').setValue('Updated');
        component.detailsForm.get('first_name').markAsDirty();

        component.detailsForm.get('email_alternative').setValue(details.email_alternative);
        component.detailsForm.get('email_alternative').markAsDirty();
        component.selectedCountry = details.country;
        component.selectedTimezone = details.timezone;

        component.update();

        const req = httpMock.expectOne('/rest/v1/account/details');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({
            first_name: 'Updated',
            password: 'secret-password',
        });

        req.flush({
            status: 'success',
            result: {
                ...details,
                first_name: 'Updated',
            },
        });
    });

    it('posts the alternative email address when it changes', () => {
        component.detailsForm.get('email_alternative').setValue('new@example.com');
        component.detailsForm.get('email_alternative').markAsDirty();
        component.selectedCountry = details.country;
        component.selectedTimezone = details.timezone;

        component.update();

        const req = httpMock.expectOne('/rest/v1/account/details');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({
            email_alternative: 'new@example.com',
            password: 'secret-password',
        });

        req.flush({
            status: 'success',
            result: {
                ...details,
                email_alternative: 'new@example.com',
                email_alternative_status: 1,
            },
        });
    });
});
