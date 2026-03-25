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

import { of } from 'rxjs';
import { UntypedFormBuilder } from '@angular/forms';
import { PersonalDetailsComponent } from './personal-details.component';

describe('PersonalDetailsComponent', () => {
    const httpMock = {
        get: (url: string) => {
            if (url === '/rest/v1/timezones') {
                return of({ result: { timezones: ['Europe/Oslo'] } });
            }

            if (url === '/rest/v1/account/details') {
                return of({
                    result: {
                        country: 'NO',
                        timezone: 'Europe/Oslo',
                        email_alternative_status: 0,
                    },
                });
            }

            throw new Error(`Unexpected GET ${url}`);
        },
        post: () => of({ result: {} }),
    };

    const dialogMock = {
        open: () => ({
            afterClosed: () => of(null),
        }),
    };

    const rmmMock = {
        account_security: { user_password: 'secret' },
        show_error: () => undefined,
    };

    it('loads countries in alphabetical order', () => {
        const component = new PersonalDetailsComponent(
            new UntypedFormBuilder(),
            httpMock as any,
            dialogMock as any,
            rmmMock as any,
        );

        const countryNames = component.countriesAndTimezones.map((country) => country.name);
        const sortedCountryNames = [...countryNames].sort((left, right) => left.localeCompare(right));

        expect(countryNames).toEqual(sortedCountryNames);
    });
});
