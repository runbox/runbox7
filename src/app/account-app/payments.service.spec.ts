// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2024 Runbox Solutions AS (runbox.com).
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

import { PaymentsService } from './payments.service';
import { Product } from './product';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Observable, firstValueFrom } from 'rxjs';

class MockRunboxWebmailAPI {
    private products: Product[] = [
        new Product({ pid: 1, name: 'Product 1', price: 10, id: 'prod1', type: 'subscription', description: 'Test product 1', currency: 'USD', quotas: {} }),
        new Product({ pid: 2, name: 'Product 2', price: 20, id: 'prod2', type: 'subscription', description: 'Test product 2', currency: 'USD', quotas: {} })
    ];

    me: Observable<any> = of({ currency: 'USD' });

    getUpgrades(): Observable<Product[]> {
        return of(this.products);
    }

    getStripePubkey(): Observable<string> {
        return of('pk_test_12345');
    }

    createCustomerSession(): Observable<any> {
        return of({ clientSecret: 'test_secret' });
    }

    payWithStripe(tid: number, _token: string): Observable<any> {
        return of({ success: true, transactionId: tid });
    }

    confirmStripePayment(paymentId: string): Observable<any> {
        return of({ status: 'succeeded', id: paymentId });
    }
}

describe('PaymentsService', () => {
    let service: PaymentsService;
    let mockRmmapi: MockRunboxWebmailAPI;

    beforeEach(() => {
        mockRmmapi = new MockRunboxWebmailAPI();
        service = new PaymentsService(mockRmmapi as any);
    });

    describe('Products retrieval', () => {
        it('should return products from API', async () => {
            const products = await firstValueFrom(service.products);

            expect(products).toBeDefined();
            expect(products.length).toBe(2);
            expect(products[0].pid).toBe(1);
            expect(products[1].pid).toBe(2);
        });

        it('should return same products consistently', async () => {
            const firstProducts = await firstValueFrom(service.products);
            const secondProducts = await firstValueFrom(service.products);

            expect(firstProducts).toBe(secondProducts);
        });
    });

    describe('Stripe public key retrieval', () => {
        it('should return stripe public key from API', async () => {
            const pubkey = await firstValueFrom(service.stripePubkey);

            expect(pubkey).toBeDefined();
            expect(pubkey).toBe('pk_test_12345');
        });
    });

    describe('Currency retrieval', () => {
        it('should return currency from user profile', async () => {
            const currency = await firstValueFrom(service.currency);

            expect(currency).toBeDefined();
            expect(currency).toBe('USD');
        });

        it('should use currency from me observable', async () => {
            const customRmmapi = {
                me: of({ currency: 'EUR' }),
                getUpgrades: () => of([]),
                getStripePubkey: () => of('pk_test'),
                createCustomerSession: () => of({}),
                payWithStripe: () => of({}),
                confirmStripePayment: () => of({})
            } as any;

            const customService = new PaymentsService(customRmmapi);

            const currency = await firstValueFrom(customService.currency);
            expect(currency).toBe('EUR');
        });
    });

    describe('Error handling', () => {
        it('should emit errors through errorLog', (done) => {
            const errors: HttpErrorResponse[] = [];
            service.errorLog.subscribe(e => errors.push(e));

            const testError = new HttpErrorResponse({ status: 500, statusText: 'Server Error' });
            service.apiErrorHandler(testError);

            setTimeout(() => {
                expect(errors.length).toBe(1);
                expect(errors[0].status).toBe(500);
                done();
            }, 10);
        });

        it('should handle multiple errors', (done) => {
            const errors: HttpErrorResponse[] = [];
            service.errorLog.subscribe(e => errors.push(e));

            service.apiErrorHandler(new HttpErrorResponse({ status: 400, statusText: 'Bad Request' }));
            service.apiErrorHandler(new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }));

            setTimeout(() => {
                expect(errors.length).toBe(2);
                expect(errors[0].status).toBe(400);
                expect(errors[1].status).toBe(401);
                done();
            }, 10);
        });
    });

    describe('Payment methods', () => {
        it('should create customer session', async () => {
            const session = await firstValueFrom(service.customerSession());

            expect(session).toBeDefined();
            expect(session.clientSecret).toBe('test_secret');
        });

        it('should submit stripe payment', async () => {
            const result = await firstValueFrom(service.submitStripePayment(123, 'tok_test'));

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.transactionId).toBe(123);
        });

        it('should confirm stripe payment', async () => {
            const result = await firstValueFrom(service.confirmStripePayment('pi_test'));

            expect(result).toBeDefined();
            expect(result.status).toBe('succeeded');
            expect(result.id).toBe('pi_test');
        });
    });
});
