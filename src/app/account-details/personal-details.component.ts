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
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { AccountDetailsInterface } from '../rmm/account-details';

@Component({
    selector: 'app-personal-details-component',
    templateUrl: './personal-details.component.html',
    styleUrls: ['account-details.component.scss'],
})
export class PersonalDetailsComponent {
    hide = true;

    details: Subject<AccountDetailsInterface> = new Subject();

    detailsForm = this.createForm();

    constructor(private fb: FormBuilder, private http: HttpClient) {
        this.details.subscribe((details: AccountDetailsInterface) => {
            this.detailsForm.patchValue(details);
        });

        this.loadDetails();
    }

    private loadDetails() {
        this.http
            .get('/rest/v1/account/details')
            .pipe(map((res: HttpResponse<any>) => res['result']))
            .subscribe((details) => {
                this.details.next(details);
            });
    }

    private createForm(): FormGroup {
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

    public update() {
        const updates = {};
        for (const name of Object.keys(this.detailsForm.controls)) {
            const ctl = this.detailsForm.get(name);
            if (ctl.dirty) {
                updates[name] = ctl.value;
            }
        }

        this.http
            .post('/rest/v1/account/details', updates)
            .pipe(map((res: HttpResponse<any>) => res['result']))
            .subscribe((details) => {
                this.details.next(details);
            });
    }
}
