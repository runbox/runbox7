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

import { HttpClient, HttpResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { UntypedFormBuilder, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { RMM } from '../rmm';
import { map } from 'rxjs/operators';
import { AccountDetailsInterface } from '../rmm/account-details';
import { ModalPasswordComponent } from '../account-security/account.security.component';
import * as ct from 'countries-and-timezones';

interface CountryAndTimezone {
    id: string;
    name: string;
    timezones: string[];
}

@Component({
    selector: 'app-personal-details-component',
    templateUrl: './personal-details.component.html',
    styleUrls: ['account-details.component.scss'],
})
export class PersonalDetailsComponent {
    hide = true;
    myControl = new UntypedFormControl();
    countriesAndTimezones: CountryAndTimezone[] = [];
    timezones: string[];
    detailsForm = this.createForm();
    modal_password_ref;

    details: Subject<AccountDetailsInterface> = new Subject();

    selectedCountry: any;
    selectedTimezone: any;

    constructor(
        private fb: UntypedFormBuilder,
        private http: HttpClient,
        public dialog: MatDialog,
        public rmm: RMM,
    ) {
        this.details.subscribe((details: AccountDetailsInterface) => {
            this.detailsForm.patchValue(details);
        });

        this.loadDetails();
        this.loadCountryList();
        this.loadSelectFields();
        this.loadTimezones();
    }

    ngOnInit() {
        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
        }
    }

    private createForm(): UntypedFormGroup {
        return this.fb.group({
            first_name: this.fb.control(''),
            last_name: this.fb.control(''),
            email_alternative: this.fb.control(''),
            phone_number: this.fb.control(''),
            company: this.fb.control(''),
            org_number: this.fb.control(''),
            vat_number: this.fb.control(''),
            street_address: this.fb.control(''),
            city: this.fb.control(''),
            postal_code: this.fb.control(''),
            country: this.fb.control(''),
            timezone: this.fb.control(''),
        });
    }

    loadCountryList() {
        for (const country in ct.getAllCountries()) {
            if (country) {
                const ctObject = {
                    id: country,
                    name: ct.getAllCountries()[country].name,
                    timezones: ct.getAllCountries()[country].timezones,
                };
                this.countriesAndTimezones.push(ctObject);
            }
        }
    }

    loadTimezones() {
        this.http
            .get('/rest/v1/timezones')
            .pipe(map((res: HttpResponse<any>) => res['result']))
            .toPromise()
            .then((data) => this.timezones = data.timezones);
    }

    private loadDetails() {
        this.http
            .get('/rest/v1/account/details')
            .pipe(map((res: HttpResponse<any>) => res['result']))
            .subscribe((details) => {
                this.details.next(details);
            });
    }

    private loadSelectFields() {
        this.http
            .get('/rest/v1/account/details')
            .pipe(map((res: HttpResponse<any>) => res['result']))
            .toPromise()
            .then((data) => {
                this.selectedCountry = data.country;
                this.selectedTimezone = data.timezone;
            });
    }

    public update() {
        if (!this.rmm.account_security.user_password) {
            this.show_modal_password();
            return;
        }

        const updates = {};
        for (const name of Object.keys(this.detailsForm.controls)) {
            const ctl = this.detailsForm.get(name);

            // Select fields can't be marked as 'dirty', so it
            // needs a specified case for Countries and Timezones
            if (ctl.dirty) {
                updates[name] = ctl.value;
            } else if (name === 'timezone') {
                updates[name] = this.selectedTimezone;
            } else if (name === 'country') {
                updates[name] = this.selectedCountry;
            }
        }
        updates['password'] = this.rmm.account_security.user_password;

        this.http
            .post('/rest/v1/account/details', updates)
            .pipe(map((res: HttpResponse<any>) => res['result']))
            .subscribe((details) => {
                this.details.next(details);
            });

        this.rmm.show_error('Account details updated', 'Dismiss');
    }

    show_modal_password() {
        this.modal_password_ref = this.dialog.open(ModalPasswordComponent, {
            width: '600px',
            disableClose: true,
            data: { password: null },
        });
        this.modal_password_ref.afterClosed().subscribe((result) => {
            if (result && result['password']) {
                this.rmm.account_security.user_password = result['password'];
            }
        });
    }
}
