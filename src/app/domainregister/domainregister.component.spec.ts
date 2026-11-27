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

import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { of } from 'rxjs';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { DomainRegisterComponent } from './domainregister.component';

describe('DomainRegisterComponent email domain quota (#1994)', () => {
    let component: DomainRegisterComponent;
    let httpMock: HttpTestingController;
    let snackBar: jasmine.SpyObj<MatSnackBar>;
    const quotaUrl = '/rest/v1/email_hosting/domains_quota';
    const availabilityUrl = '/rest/v1/domain_registration/enom/check_avail';

    beforeEach(() => {
        snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [{ provide: RunboxWebmailAPI, useValue: { me: of({ is_trial: false }) } }],
        });
        httpMock = TestBed.inject(HttpTestingController);
        component = new DomainRegisterComponent(
            TestBed.inject(HttpClient), snackBar, TestBed.inject(RunboxWebmailAPI)
        );
        httpMock.match('/rest/v1/domain_registration/enom/tld_list').forEach(request => {
            request.flush({ result: { product_list: [{ tld: 'com' }] } });
        });
        component.domain_wanted = 'example.com';
    });

    afterEach(() => httpMock.verify());

    for (const used of ['7', 7]) {
        it(`allows an availability check when ${JSON.stringify(used)} domains are used out of "20"`, () => {
            httpMock.expectOne(quotaUrl).flush({
                result: { domain_quota_used: used, domain_quota_allowed: '20' },
            });
            expect(snackBar.open).not.toHaveBeenCalled();
            // The template uses these same values to decide whether to show the registration form.
            expect(component.domain_quota_used < component.domain_quota_allowed).toBeTrue();
            component.check_avail();
            const request = httpMock.expectOne(availabilityUrl);
            expect(request.request.method).toBe('POST');
            expect(request.request.body).toEqual({ sld: 'example', tld: 'com' });
            request.flush({ status: 'error', errors: ['End of synthetic availability response'] });
        });
    }

    for (const quota of [
        { used: '20', allowed: '20' },
        { used: '100', allowed: '20' },
        { used: '0', allowed: '0' },
        { used: 0, allowed: 0 },
    ]) {
        it(`blocks availability at quota ${JSON.stringify(quota)}`, () => {
            httpMock.expectOne(quotaUrl).flush({
                result: { domain_quota_used: quota.used, domain_quota_allowed: quota.allowed },
            });
            expect(snackBar.open).toHaveBeenCalled();
            expect(component.domain_quota_used >= component.domain_quota_allowed).toBeTrue();
            snackBar.open.calls.reset();
            component.check_avail();
            expect(snackBar.open).toHaveBeenCalled();
            httpMock.expectNone(availabilityUrl);
        });
    }
});
