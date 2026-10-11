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

import { of, Subject } from 'rxjs';

import { AccountRenewalsComponent } from './account-renewals.component';

describe('AccountRenewalsComponent', () => {
    interface TestActiveProduct {
        pid: number;
        apid: number;
        type: string;
        subtype: string;
        name: string;
        quantity: number;
        price: unknown;
        currency: string;
        active: boolean;
        active_from: unknown;
        active_until: unknown;
        quotas: Record<string, unknown>;
        subaccounts: string[];
    }

    function activeProduct(properties: Partial<TestActiveProduct> = {}): TestActiveProduct {
        return {
            pid: 2001,
            apid: 3001,
            type: 'subscription',
            subtype: 'main',
            name: 'Runbox Medium',
            quantity: 1,
            price: '19.9',
            currency: 'USD',
            active: true,
            active_from: '2026-01-01T00:00:00Z',
            active_until: '2027-01-01T00:00:00Z',
            quotas: {},
            subaccounts: [],
            ...properties,
        };
    }

    function createComponent(products: TestActiveProduct[], mobile = false) {
        const mobileQuery = {
            matches: mobile,
            changed: new Subject<boolean>(),
        };
        const cart = {
            items: of([]),
            add: jasmine.createSpy('add').and.returnValue(Promise.resolve()),
            contains: jasmine.createSpy('contains').and.returnValue(Promise.resolve(false)),
        };
        const rmmapi = {
            me: of({ subscription: 2001 }),
            getActiveProducts: jasmine.createSpy('getActiveProducts').and.returnValue(of(products)),
            getProductDomain: jasmine.createSpy('getProductDomain').and.returnValue(of('example.net')),
            setProductAutorenew: jasmine.createSpy('setProductAutorenew').and.returnValue(of({})),
        };
        const rmm = {
            account_storage: {
                getUsage: jasmine.createSpy('getUsage').and.returnValue(of({ result: {} })),
            },
        };

        const component = new AccountRenewalsComponent(
            mobileQuery as unknown as ConstructorParameters<typeof AccountRenewalsComponent>[0],
            cart as unknown as ConstructorParameters<typeof AccountRenewalsComponent>[1],
            {} as unknown as ConstructorParameters<typeof AccountRenewalsComponent>[2],
            rmmapi as unknown as ConstructorParameters<typeof AccountRenewalsComponent>[3],
            {} as unknown as ConstructorParameters<typeof AccountRenewalsComponent>[4],
            {} as unknown as ConstructorParameters<typeof AccountRenewalsComponent>[5],
            rmm as unknown as ConstructorParameters<typeof AccountRenewalsComponent>[6],
        );

        return { component, mobileQuery };
    }

    it('formats active product prices with currency and two decimals', () => {
        const { component } = createComponent([activeProduct()]);

        expect(component.formatProductPrice(component.active_products[0])).toBe('USD 19.90');
    });

    it('formats Decimal-like active product prices', () => {
        const price = {
            toNumber: () => 29,
        };
        const { component } = createComponent([
            activeProduct({
                currency: 'EUR',
                price,
            }),
        ]);

        expect(component.formatProductPrice(component.active_products[0])).toBe('EUR 29.00');
    });

    it('keeps price in the desktop table and mobile details layout', () => {
        const { component, mobileQuery } = createComponent([activeProduct()]);

        expect(component.displayedColumns).toContain('price');

        mobileQuery.changed.next(true);

        expect(component.displayedColumns).toEqual(['renewal_name']);
        expect(component.formatProductPrice(component.active_products[0])).toBe('USD 19.90');
    });
});
