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

import { AsyncSubject, firstValueFrom } from 'rxjs';

/**
 * Tests for Stripe Payment Dialog RxJS patterns.
 *
 * Tests the script loader pattern used in stripe-payment-dialog.component.ts
 * where an AsyncSubject<void> is used to track Stripe.js loading.
 *
 * Bug fixed: AsyncSubject must call next() before complete() to work with firstValueFrom().
 */
describe('Stripe Payment Dialog RxJS Patterns', () => {
    describe('Stripe Script Loader (AsyncSubject<void>)', () => {
        // Reset the module-level stripeLoader between tests
        let stripeLoader: AsyncSubject<void> = null;

        beforeEach(() => {
            stripeLoader = null;
        });

        it('should resolve firstValueFrom when script loads successfully', async () => {
            stripeLoader = new AsyncSubject<void>();

            // Simulate script.onload - must call next() before complete()
            stripeLoader.next();
            stripeLoader.complete();

            await expectAsync(firstValueFrom(stripeLoader)).toBeResolved();
        });

        it('should throw EmptyError if complete() called without next() (the bug)', async () => {
            stripeLoader = new AsyncSubject<void>();

            // BUG: Only calling complete() without next()
            stripeLoader.complete();

            await expectAsync(firstValueFrom(stripeLoader))
                .toBeRejectedWithError('no elements in sequence');
        });

        it('should reuse existing loader for multiple dialog instances (singleton)', async () => {
            // First dialog instance creates the loader
            if (stripeLoader === null) {
                stripeLoader = new AsyncSubject<void>();
                // Simulate script load
                setTimeout(() => {
                    stripeLoader.next();
                    stripeLoader.complete();
                }, 5);
            }

            // First instance waits for load
            await firstValueFrom(stripeLoader);

            // Second dialog instance reuses existing loader
            if (stripeLoader === null) {
                fail('Loader should already exist');
            }

            // Second instance should resolve immediately since loader is complete
            await expectAsync(firstValueFrom(stripeLoader)).toBeResolved();
        });

        it('should allow late subscribers after script load complete', async () => {
            stripeLoader = new AsyncSubject<void>();
            stripeLoader.next();
            stripeLoader.complete();

            // Multiple late subscribers should all succeed
            const results = await Promise.all([
                firstValueFrom(stripeLoader),
                firstValueFrom(stripeLoader),
                firstValueFrom(stripeLoader),
            ]);

            expect(results.length).toBe(3);
        });

        it('should propagate script load errors', async () => {
            stripeLoader = new AsyncSubject<void>();
            const promise = firstValueFrom(stripeLoader);

            // Simulate script.onerror
            stripeLoader.error(new Error('Script failed to load'));

            await expectAsync(promise).toBeRejectedWithError('Script failed to load');
        });
    });

    describe('PaymentsService AsyncSubject patterns', () => {
        it('should resolve stripePubkey after API call', async () => {
            const stripePubkey = new AsyncSubject<string>();

            // Simulate API response
            setTimeout(() => {
                stripePubkey.next('pk_test_123');
                stripePubkey.complete();
            }, 5);

            const result = await firstValueFrom(stripePubkey);
            expect(result).toBe('pk_test_123');
        });

        it('should resolve customerSession observable', async () => {
            const customerSession = new AsyncSubject<{ customer_session_client_secret: string }>();

            setTimeout(() => {
                customerSession.next({ customer_session_client_secret: 'secret_123' });
                customerSession.complete();
            }, 5);

            const result = await firstValueFrom(customerSession);
            expect(result.customer_session_client_secret).toBe('secret_123');
        });

        it('should handle concurrent access to stripePubkey', async () => {
            const stripePubkey = new AsyncSubject<string>();

            const promise1 = firstValueFrom(stripePubkey);
            const promise2 = firstValueFrom(stripePubkey);

            stripePubkey.next('pk_concurrent');
            stripePubkey.complete();

            const [result1, result2] = await Promise.all([promise1, promise2]);
            expect(result1).toBe('pk_concurrent');
            expect(result2).toBe('pk_concurrent');
        });
    });

    describe('Payment Dialog Initialization Sequence', () => {
        it('should handle sequential async operations', async () => {
            const stripeLoader = new AsyncSubject<void>();
            const stripePubkey = new AsyncSubject<string>();
            const customerSession = new AsyncSubject<object>();

            // Simulate all loading
            setTimeout(() => {
                stripeLoader.next();
                stripeLoader.complete();
            }, 5);
            setTimeout(() => {
                stripePubkey.next('pk_test');
                stripePubkey.complete();
            }, 10);
            setTimeout(() => {
                customerSession.next({});
                customerSession.complete();
            }, 15);

            // Simulate ngAfterViewInit
            await firstValueFrom(stripeLoader);
            const pubkey = await firstValueFrom(stripePubkey);
            const session = await firstValueFrom(customerSession);

            expect(pubkey).toBe('pk_test');
            expect(session).toEqual({});
        });
    });
});
