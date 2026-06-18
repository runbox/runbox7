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
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Runbox 7. If not, see <https://www.gnu.org/licenses/>.
// ---------- END RUNBOX LICENSE ----------

import { Decimal } from 'decimal.js-light';
import { of, Subject, throwError } from 'rxjs';

import { ProductOrder } from './product-order';
import { ShoppingCartComponent } from './shopping-cart.component';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_EVEN });

describe('ShoppingCartComponent', () => {
    let cart: any;
    let dialog: any;
    let mobileQuery: any;
    let paymentsService: any;
    let rmmapi: any;
    let route: any;
    let router: any;

    function createComponent(): ShoppingCartComponent {
        const component = new ShoppingCartComponent(
            cart,
            dialog,
            mobileQuery,
            paymentsService,
            rmmapi,
            route,
            router,
        );

        const product = {
            pid: 101,
            name: 'Runbox Mini',
            price: new Decimal(10),
            currency: 'USD',
            type: 'subscription',
        };
        component.items = [{
            ...new ProductOrder(101, 'subscription', new Decimal(1)),
            product,
        } as any];

        return component;
    }

    beforeEach(() => {
        cart = {
            clear: jasmine.createSpy('clear'),
            items: of([]),
        };
        dialog = {
            open: jasmine.createSpy('open').and.returnValue({
                afterClosed: () => of(false),
            }),
        };
        mobileQuery = {
            matches: false,
            changed: new Subject<boolean>(),
        };
        paymentsService = {
            products: of([]),
        };
        rmmapi = {
            me: of({ is_trial: false }),
            orderProducts: jasmine.createSpy('orderProducts').and.returnValue(of({ tid: 123 })),
        };
        route = {
            queryParams: of({}),
        };
        router = {
            navigateByUrl: jasmine.createSpy('navigateByUrl').and.returnValue(Promise.resolve(true)),
        };
    });

    it('shows a payment error when order creation fails', async () => {
        const component = createComponent();
        const error = new Error('order failed');
        spyOn(console, 'error');
        rmmapi.orderProducts.and.returnValue(throwError(() => error));

        await component.startPayment('stripe');

        expect(component.paymentError).toBe('Could not start the payment. Try again later, or contact Runbox Support.');
        expect(console.error).toHaveBeenCalledWith('Failed to initiate stripe payment', error);
        expect(dialog.open).not.toHaveBeenCalled();
    });

    it('clears stale payment errors when payment starts successfully', async () => {
        const component = createComponent();
        component.paymentError = 'Previous payment error';

        await component.startPayment('stripe');

        expect(component.paymentError).toBeUndefined();
        expect(rmmapi.orderProducts).toHaveBeenCalledWith(
            jasmine.any(Array),
            'stripe',
            'USD',
            undefined,
        );
        expect(dialog.open).toHaveBeenCalled();
    });

    it('shows a payment error when the giro receipt route cannot be opened', async () => {
        const component = createComponent();
        const error = new Error('navigation failed');
        spyOn(console, 'error');
        router.navigateByUrl.and.returnValue(Promise.reject(error));

        await component.startPayment('giro');

        expect(component.paymentError).toBe('Could not start the payment. Try again later, or contact Runbox Support.');
        expect(console.error).toHaveBeenCalledWith('Failed to initiate giro payment', error);
        expect(cart.clear).not.toHaveBeenCalled();
    });
});
