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

import { Observable, of, Subject, throwError } from 'rxjs';

import { AccountRenewalsComponent } from './account-renewals.component';

describe('AccountRenewalsComponent', () => {
    interface TestActiveProduct {
        pid: number;
        apid: number;
        type: string;
        subtype: string;
        name: string;
        quantity: number;
        price: string;
        currency: string;
        active: boolean;
        active_from: unknown;
        active_until: unknown;
        quotas: Record<string, unknown>;
        associated_domain?: string;
        associated_domain_loading?: boolean;
        associated_domain_failed?: boolean;
    }

    function activeProduct(properties: Partial<TestActiveProduct> = {}): TestActiveProduct {
        return {
            pid: 2001,
            apid: 3001,
            type: 'subscription',
            subtype: 'domain',
            name: 'Domain hosting',
            quantity: 1,
            price: '19.95',
            currency: 'USD',
            active: true,
            active_from: '2026-01-01T00:00:00Z',
            active_until: '2027-01-01T00:00:00Z',
            quotas: {},
            ...properties,
        };
    }

    function createComponent(products: TestActiveProduct[], domainResponse: Observable<string> = of('example.net')) {
        const mobileQuery = {
            matches: false,
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
            getProductDomain: jasmine.createSpy('getProductDomain').and.returnValue(domainResponse),
            setProductAutorenew: jasmine.createSpy('setProductAutorenew').and.returnValue(of({})),
        };
        const router = {
            navigateByUrl: jasmine.createSpy('navigateByUrl'),
        };
        const snackbar = {
            open: jasmine.createSpy('open'),
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
            router as unknown as ConstructorParameters<typeof AccountRenewalsComponent>[4],
            snackbar as unknown as ConstructorParameters<typeof AccountRenewalsComponent>[5],
            rmm as unknown as ConstructorParameters<typeof AccountRenewalsComponent>[6],
        );

        return { cart, component, rmmapi, router, snackbar };
    }

    it('loads associated domain names for domain subscriptions', () => {
        const domainProduct = activeProduct();
        const { component, rmmapi } = createComponent([domainProduct], of('example.net'));

        expect(rmmapi.getProductDomain).toHaveBeenCalledWith(3001);
        expect(rmmapi.getProductDomain.calls.count()).toBe(1);
        expect(domainProduct.associated_domain).toBe('example.net');
        expect(domainProduct.associated_domain_loading).toBe(false);
        expect(domainProduct.associated_domain_failed).toBe(false);
        expect(component.domainDisplayText(component.active_products[0])).toBe('example.net');
    });

    it('does not fetch domains for non-domain subscriptions', () => {
        const subscriptionProduct = activeProduct({
            apid: 3002,
            subtype: 'main',
            name: 'Runbox Medium',
        });
        const { component, rmmapi } = createComponent([subscriptionProduct]);

        expect(rmmapi.getProductDomain).not.toHaveBeenCalled();
        expect(component.domainDisplayText(component.active_products[0])).toBe('');
    });

    it('shows unavailable text when the associated domain cannot be loaded', () => {
        const domainProduct = activeProduct();
        const { component } = createComponent(
            [domainProduct],
            throwError(() => new Error('domain lookup failed')),
        );

        expect(domainProduct.associated_domain).toBeUndefined();
        expect(domainProduct.associated_domain_loading).toBe(false);
        expect(domainProduct.associated_domain_failed).toBe(true);
        expect(component.domainDisplayText(component.active_products[0])).toBe('Domain unavailable');
    });

    it('uses the loaded associated domain when renewing a domain subscription', () => {
        const domainProduct = activeProduct();
        const { component, rmmapi, router } = createComponent([domainProduct], of('example.net'));
        rmmapi.getProductDomain.calls.reset();

        component.renewDomain(component.active_products[0]);

        expect(rmmapi.getProductDomain).not.toHaveBeenCalled();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/domainregistration?renew_domain=example.net');
    });
});
