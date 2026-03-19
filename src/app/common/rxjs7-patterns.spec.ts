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

import { AsyncSubject, ReplaySubject, Subject, firstValueFrom, lastValueFrom, of, EMPTY } from 'rxjs';
import { take } from 'rxjs/operators';

/**
 * Tests for RxJS 7 patterns used throughout the codebase.
 *
 * These tests verify the correct usage of:
 * - firstValueFrom with AsyncSubject
 * - firstValueFrom with ReplaySubject
 * - AsyncSubject completion patterns
 * - ReplaySubject buffering
 *
 */
describe('RxJS 7 Migration Patterns', () => {
    describe('AsyncSubject with firstValueFrom', () => {
        it('should resolve when next() then complete() is called', async () => {
            const subject = new AsyncSubject<string>();
            const promise = firstValueFrom(subject);

            subject.next('test value');
            subject.complete();

            const result = await promise;
            expect(result).toBe('test value');
        });

        it('should resolve with void when next(void) then complete() is called', async () => {
            const subject = new AsyncSubject<void>();
            const promise = firstValueFrom(subject);

            subject.next();
            subject.complete();

            // Should resolve without error
            await promise;
        });

        it('should throw EmptyError when complete() is called without next()', async () => {
            const subject = new AsyncSubject<void>();
            const promise = firstValueFrom(subject);

            subject.complete();

            await expectAsync(promise).toBeRejectedWithError('no elements in sequence');
        });

        it('should resolve for late subscribers after completion', async () => {
            const subject = new AsyncSubject<string>();

            subject.next('cached value');
            subject.complete();

            // Late subscriber should get the cached value
            const result = await firstValueFrom(subject);
            expect(result).toBe('cached value');
        });

        it('should only emit the last value before complete', async () => {
            const subject = new AsyncSubject<number>();
            const promise = firstValueFrom(subject);

            subject.next(1);
            subject.next(2);
            subject.next(3);
            subject.complete();

            const result = await promise;
            expect(result).toBe(3);
        });

        it('should propagate errors to firstValueFrom', async () => {
            const subject = new AsyncSubject<string>();
            const promise = firstValueFrom(subject);

            subject.error(new Error('test error'));

            await expectAsync(promise).toBeRejectedWithError('test error');
        });

        it('should handle error after next but before complete', async () => {
            const subject = new AsyncSubject<string>();
            const promise = firstValueFrom(subject);

            subject.next('value');
            subject.error(new Error('error after next'));

            await expectAsync(promise).toBeRejectedWithError('error after next');
        });
    });

    describe('ReplaySubject with firstValueFrom', () => {
        it('should resolve immediately if value already emitted', async () => {
            const subject = new ReplaySubject<string>(1);

            subject.next('initial value');

            // Should resolve immediately without waiting
            const result = await firstValueFrom(subject);
            expect(result).toBe('initial value');
        });

        it('should wait for first value if empty', async () => {
            const subject = new ReplaySubject<string>(1);
            const promise = firstValueFrom(subject);

            // Emit value after promise is created
            setTimeout(() => subject.next('delayed value'), 10);

            const result = await promise;
            expect(result).toBe('delayed value');
        });

        it('should handle buffer size of 1 correctly', async () => {
            const subject = new ReplaySubject<number>(1);

            subject.next(1);
            subject.next(2);
            subject.next(3);

            const result = await firstValueFrom(subject);
            expect(result).toBe(3);
        });

        it('should provide same cached value to multiple subscribers', async () => {
            const subject = new ReplaySubject<string>(1);
            subject.next('shared value');

            const result1 = await firstValueFrom(subject);
            const result2 = await firstValueFrom(subject);

            expect(result1).toBe('shared value');
            expect(result2).toBe('shared value');
        });

        it('should replay values to late subscribers', async () => {
            const subject = new ReplaySubject<number>(3);

            subject.next(1);
            subject.next(2);
            subject.next(3);
            subject.complete();

            // Late subscriber should get the last value using lastValueFrom
            const result = await lastValueFrom(subject);
            expect(result).toBe(3);
        });

        it('should work with Map data structure', async () => {
            const subject = new ReplaySubject<Map<string, any>>(1);
            const testData = new Map<string, any>([['key1', 'value1'], ['key2', 42]]);

            subject.next(testData);

            const result = await firstValueFrom(subject);
            expect(result.get('key1')).toBe('value1');
            expect(result.get('key2')).toBe(42);
        });

        it('should handle complete after value emission', async () => {
            const subject = new ReplaySubject<string>(1);

            subject.next('final value');
            subject.complete();

            const result = await firstValueFrom(subject);
            expect(result).toBe('final value');
        });
    });

    describe('firstValueFrom edge cases', () => {
        it('should throw EmptyError on EMPTY observable', async () => {
            await expectAsync(firstValueFrom(EMPTY)).toBeRejectedWithError('no elements in sequence');
        });

        it('should throw on observable that only errors', async () => {
            const error$ = new Subject<string>();
            const promise = firstValueFrom(error$);

            error$.error(new Error('immediate error'));

            await expectAsync(promise).toBeRejectedWithError('immediate error');
        });

        it('should work with synchronous of()', async () => {
            const result = await firstValueFrom(of('sync value'));
            expect(result).toBe('sync value');
        });

        it('should work with pipe and take(1)', async () => {
            const subject = new ReplaySubject<number>(1);
            subject.next(42);

            const result = await firstValueFrom(subject.pipe(take(1)));
            expect(result).toBe(42);
        });
    });

    describe('Script Loader Pattern (AsyncSubject<void>)', () => {
        // This pattern is used in:
        // - stripe-payment-dialog.component.ts
        // - stripe-add-card-dialog.component.ts
        // - onscreen.component.ts

        it('should correctly implement the script loader pattern', async () => {
            const loader = new AsyncSubject<void>();

            // Simulate script.onload callback
            setTimeout(() => {
                loader.next();
                loader.complete();
            }, 10);

            // This should resolve without error
            await firstValueFrom(loader);
        });

        it('should allow reuse of completed AsyncSubject', async () => {
            const loader = new AsyncSubject<void>();

            // First "load"
            loader.next();
            loader.complete();

            // First consumer
            await firstValueFrom(loader);

            // Second consumer (late) should also succeed
            await firstValueFrom(loader);
        });

        it('should fail if complete() is called without next() (the bug pattern)', async () => {
            const loader = new AsyncSubject<void>();

            // BUG: Only calling complete() without next()
            loader.complete();

            await expectAsync(firstValueFrom(loader)).toBeRejectedWithError('no elements in sequence');
        });
    });

    describe('Concurrent Access Patterns', () => {
        it('should handle concurrent firstValueFrom calls on ReplaySubject', async () => {
            const subject = new ReplaySubject<number>(1);

            // Start multiple promises before value is emitted
            const promise1 = firstValueFrom(subject);
            const promise2 = firstValueFrom(subject);
            const promise3 = firstValueFrom(subject);

            // Emit value
            subject.next(123);

            const results = await Promise.all([promise1, promise2, promise3]);
            expect(results).toEqual([123, 123, 123]);
        });

        it('should handle concurrent access to AsyncSubject', async () => {
            const subject = new AsyncSubject<string>();

            const promise1 = firstValueFrom(subject);
            const promise2 = firstValueFrom(subject);

            subject.next('concurrent value');
            subject.complete();

            const results = await Promise.all([promise1, promise2]);
            expect(results).toEqual(['concurrent value', 'concurrent value']);
        });
    });

    describe('Migration from toPromise() to firstValueFrom()', () => {
        it('should behave differently than toPromise() for empty AsyncSubject', async () => {
            // This test documents the breaking change from toPromise() to firstValueFrom()

            const subject = new AsyncSubject<void>();
            subject.complete();

            // toPromise() would resolve with undefined
            // (commented out as toPromise is deprecated)
            // const result = await subject.toPromise();
            // expect(result).toBeUndefined();

            // firstValueFrom() throws EmptyError
            await expectAsync(firstValueFrom(subject)).toBeRejectedWithError('no elements in sequence');
        });

        it('should behave the same when next() is called before complete()', async () => {
            const subject = new AsyncSubject<string>();

            subject.next('value');
            subject.complete();

            // Both would resolve with 'value'
            const result = await firstValueFrom(subject);
            expect(result).toBe('value');
        });

        it('should behave the same for ReplaySubject with existing value', async () => {
            const subject = new ReplaySubject<string>(1);
            subject.next('cached');

            const result = await firstValueFrom(subject);
            expect(result).toBe('cached');
        });
    });
});