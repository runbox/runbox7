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

import { ActivatedRoute } from '@angular/router';
import { Subject, of } from 'rxjs';
import { PaypalHandlerComponent } from './paypal-handler.component';

function buildComponent(action: string, queryParams: Record<string, string> = {}) {
    const routeParams = new Subject<Record<string, string>>();
    const paypalQueryParams = new Subject<Record<string, string>>();
    const cart = jasmine.createSpyObj('CartService', ['clear']);
    const rmmapi = jasmine.createSpyObj('RunboxWebmailAPI', ['confirmPaypalPayment']);
    const router = jasmine.createSpyObj('Router', ['navigateByUrl']);

    rmmapi.confirmPaypalPayment.and.returnValue(of({ tid: 12345 }));

    new PaypalHandlerComponent(
        cart,
        rmmapi,
        {
            params: routeParams.asObservable(),
            queryParams: paypalQueryParams.asObservable()
        } as Partial<ActivatedRoute> as ActivatedRoute,
        router
    );

    routeParams.next({ action });
    paypalQueryParams.next(queryParams);

    return { cart, rmmapi, router, routeParams, paypalQueryParams };
}

describe('PaypalHandlerComponent', () => {
    it('confirms a PayPal payment once and then opens the receipt', () => {
        const { cart, rmmapi, router, paypalQueryParams } = buildComponent('confirm', {
            paymentId: 'PAY-123',
            PayerID: 'PAYER-456'
        });

        paypalQueryParams.next({
            paymentId: 'PAY-123',
            PayerID: 'PAYER-456',
            ignored: 're-emission'
        });

        expect(rmmapi.confirmPaypalPayment).toHaveBeenCalledOnceWith('PAY-123', 'PAYER-456');
        expect(cart.clear).toHaveBeenCalledTimes(1);
        expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/account/receipt/12345');
    });

    it('does not confirm payments when PayPal returns to the cancel route', () => {
        const { cart, rmmapi, router } = buildComponent('cancel', {
            paymentId: 'PAY-123',
            PayerID: 'PAYER-456'
        });

        expect(rmmapi.confirmPaypalPayment).not.toHaveBeenCalled();
        expect(cart.clear).not.toHaveBeenCalled();
        expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/account/cart');
    });

    it('does not call confirm without both PayPal return identifiers', () => {
        const { cart, rmmapi, router } = buildComponent('confirm', {
            paymentId: 'PAY-123'
        });

        expect(rmmapi.confirmPaypalPayment).not.toHaveBeenCalled();
        expect(cart.clear).not.toHaveBeenCalled();
        expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/account/cart');
    });
});
