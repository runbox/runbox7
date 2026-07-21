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

import { DomainRegisterComponent } from './domainregister.component';

describe('DomainRegisterComponent quota checks', () => {
    function createComponent() {
        const http = {
            get: jasmine.createSpy('get').and.returnValues(
                of({
                    result: {
                        product_list: [
                            {
                                tld: 'com',
                                period: '1',
                                price: '10.00',
                                supports_whois_privacy: 0,
                                privacy_price: '0.00'
                            }
                        ]
                    }
                }),
                of({
                    result: {
                        domain_quota_allowed: '20',
                        domain_quota_used: '7'
                    }
                })
            ),
            post: jasmine.createSpy('post').and.returnValues(
                of({
                    result: {
                        is_available: 0,
                        products: [],
                        privacy_products: []
                    }
                }),
                of({
                    result: {
                        agreement: {
                            generic: null,
                            specific: null
                        }
                    }
                }),
                of({
                    result: {
                        specific_docs: []
                    }
                }),
                of({
                    result: {
                        generic_docs: []
                    }
                })
            )
        };
        const snackBar = {
            open: jasmine.createSpy('open')
        };
        const rmmapi = {
            me: of({ is_trial: false })
        };

        const component = new DomainRegisterComponent(
            http as any,
            snackBar as any,
            rmmapi as any
        );

        return { component, http, snackBar };
    }

    it('allows availability checks when string quota values are below the limit', () => {
        const { component, http, snackBar } = createComponent();

        component.domain_wanted = 'example.com';
        component.domain_quota_used = '7' as any;
        component.domain_quota_allowed = '20' as any;

        component.check_avail();

        expect(http.post).toHaveBeenCalledWith(
            '/rest/v1/domain_registration/enom/check_avail',
            { sld: 'example', tld: 'com' }
        );
        expect(snackBar.open).not.toHaveBeenCalledWith(
            'You have reached your allowed Email Domain quota. Please purchase more Email Hosting products.',
            'Dismiss',
            jasmine.anything()
        );
    });
});
