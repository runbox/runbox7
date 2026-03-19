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
 * Tests for Stripe Add Card Dialog RxJS patterns.
 *
 * Tests the script loader pattern used in stripe-add-card-dialog.component.ts
 * where an AsyncSubject<void> is used to track Stripe.js loading.
 *
 * Bug fixed: AsyncSubject must call next() before complete() to work with firstValueFrom().
 */
describe('Stripe Add Card Dialog RxJS Patterns', () => {
    describe('Stripe Script Loader (AsyncSubject<void>)', () => {
        let stripeLoader: AsyncSubject<void> = null;

        beforeEach(() => {
            stripeLoader = null;
        });

        it('should resolve firstValueFrom when script loads successfully', async () => {
            stripeLoader = new AsyncSubject<void>();

            // Correct pattern: next() then complete()
            stripeLoader.next();
            stripeLoader.complete();

            await expectAsync(firstValueFrom(stripeLoader)).toBeResolved();
        });

        it('should throw EmptyError if complete() called without next()', async () => {
            stripeLoader = new AsyncSubject<void>();

            // Bug pattern: complete() without next()
            stripeLoader.complete();

            await expectAsync(firstValueFrom(stripeLoader))
                .toBeRejectedWithError('no elements in sequence');
        });

        it('should share loader across dialog instances', async () => {
            // First instance
            if (stripeLoader === null) {
                stripeLoader = new AsyncSubject<void>();
                setTimeout(() => {
                    stripeLoader.next();
                    stripeLoader.complete();
                }, 5);
            }

            await firstValueFrom(stripeLoader);

            // Second instance reuses loader
            await expectAsync(firstValueFrom(stripeLoader)).toBeResolved();
        });
    });

    describe('Client Secret Handling', () => {
        it('should handle clientSecret from dialog data', async () => {
            const clientSecretSubject = new AsyncSubject<string>();

            setTimeout(() => {
                clientSecretSubject.next('seti_test_secret_123');
                clientSecretSubject.complete();
            }, 5);

            const result = await firstValueFrom(clientSecretSubject);
            expect(result).toBe('seti_test_secret_123');
        });
    });

    describe('Stripe Elements Initialization', () => {
        it('should handle sequential async initialization', async () => {
            const stripeLoader = new AsyncSubject<void>();
            const stripePubkey = new AsyncSubject<string>();
            const customerSession = new AsyncSubject<object>();

            // Simulate loading sequence
            stripeLoader.next();
            stripeLoader.complete();
            stripePubkey.next('pk_test');
            stripePubkey.complete();
            customerSession.next({});
            customerSession.complete();

            // Simulate ngAfterViewInit
            await firstValueFrom(stripeLoader);
            const pubkey = await firstValueFrom(stripePubkey);
            const session = await firstValueFrom(customerSession);

            expect(pubkey).toBe('pk_test');
            expect(session).toEqual({});
        });
    });
});
