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

import { HttpClient } from '@angular/common/http';
import { UntypedFormBuilder } from '@angular/forms';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { of } from 'rxjs';
import { RMM } from '../rmm';
import { PersonalDetailsComponent } from './personal-details.component';

describe('PersonalDetailsComponent', () => {
    const accountDetails = {
        country: 'NO',
        email_alternative_status: 0,
        timezone: 'Europe/Oslo',
    };

    function createComponent(): PersonalDetailsComponent {
        const http = {
            get: (url: string) => of({
                result: url === '/rest/v1/timezones'
                    ? { timezones: ['Europe/Oslo'] }
                    : accountDetails,
            }),
            post: () => of({ result: accountDetails }),
        } as unknown as HttpClient;

        const dialog = {
            open: () => ({
                afterClosed: () => of(null),
            }),
        } as unknown as MatDialog;

        const rmm = {
            account_security: {
                user_password: 'secret',
            },
            show_error: () => undefined,
        } as unknown as RMM;

        return new PersonalDetailsComponent(
            new UntypedFormBuilder(),
            http,
            dialog,
            rmm,
        );
    }

    it('sorts countries by display name', () => {
        const component = createComponent();
        const countryNames = component.countriesAndTimezones.map((country) => country.name);

        expect(countryNames).toEqual([...countryNames].sort((a, b) => a.localeCompare(b)));
    });

    it('rebuilds the country list instead of appending duplicates', () => {
        const component = createComponent();
        const countryCount = component.countriesAndTimezones.length;

        component.loadCountryList();

        expect(component.countriesAndTimezones.length).toBe(countryCount);
    });
});
