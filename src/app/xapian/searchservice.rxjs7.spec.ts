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
 * Tests for SearchService RxJS patterns.
 *
 * Tests the AsyncSubject initialization patterns used in searchservice.ts
 * and index.worker.ts.
 */
describe('SearchService RxJS Patterns', () => {
    describe('initSubject AsyncSubject Pattern', () => {
        it('should resolve when initialization completes', async () => {
            const initSubject = new AsyncSubject<unknown>();

            setTimeout(() => {
                initSubject.next({ initialized: true });
                initSubject.complete();
            }, 10);

            const result = await firstValueFrom(initSubject);
            expect(result).toEqual({ initialized: true });
        });

        it('should throw EmptyError if complete() without next()', async () => {
            const initSubject = new AsyncSubject<unknown>();
            initSubject.complete();

            await expectAsync(firstValueFrom(initSubject))
                .toBeRejectedWithError('no elements in sequence');
        });

        it('should allow late subscribers after completion', async () => {
            const initSubject = new AsyncSubject<boolean>();
            initSubject.next(true);
            initSubject.complete();

            // Late subscribers
            const [result1, result2] = await Promise.all([
                firstValueFrom(initSubject),
                firstValueFrom(initSubject),
            ]);

            expect(result1).toBe(true);
            expect(result2).toBe(true);
        });

        it('should propagate initialization errors', async () => {
            const initSubject = new AsyncSubject<unknown>();
            const promise = firstValueFrom(initSubject);

            initSubject.error(new Error('Index load failed'));

            await expectAsync(promise).toBeRejectedWithError('Index load failed');
        });
    });

    describe('persistIndexInProgressSubject Pattern', () => {
        it('should track index persistence state', async () => {
            const persistIndexInProgressSubject = new AsyncSubject<unknown>();

            // Start persistence
            setTimeout(() => {
                persistIndexInProgressSubject.next({ done: true });
                persistIndexInProgressSubject.complete();
            }, 20);

            const result = await firstValueFrom(persistIndexInProgressSubject);
            expect(result).toEqual({ done: true });
        });

        it('should create new subject for each persistence operation', async () => {
            // First persistence
            const subject1 = new AsyncSubject<unknown>();
            subject1.next({ id: 1 });
            subject1.complete();

            await firstValueFrom(subject1);

            // Second persistence (new subject)
            const subject2 = new AsyncSubject<unknown>();
            subject2.next({ id: 2 });
            subject2.complete();

            const result = await firstValueFrom(subject2);
            expect(result).toEqual({ id: 2 });
        });
    });

    describe('noLocalIndexFoundSubject Pattern', () => {
        it('should notify when no local index exists', async () => {
            const noLocalIndexFoundSubject = new AsyncSubject<boolean>();

            setTimeout(() => {
                noLocalIndexFoundSubject.next(true);
                noLocalIndexFoundSubject.complete();
            }, 5);

            const result = await firstValueFrom(noLocalIndexFoundSubject);
            expect(result).toBe(true);
        });
    });

    describe('Concurrent Initialization', () => {
        it('should handle multiple consumers waiting for init', async () => {
            const initSubject = new AsyncSubject<string>();

            const consumers = await Promise.all([
                firstValueFrom(initSubject).then(r => r),
                firstValueFrom(initSubject).then(r => r),
                firstValueFrom(initSubject).then(r => r),
            ].map(async p => {
                // Start waiting before completion
                setTimeout(() => {
                    initSubject.next('ready');
                    initSubject.complete();
                }, 5);
                return p;
            }));

            // All consumers get the same value
            expect(consumers.every(c => c === 'ready')).toBe(true);
        });
    });
});
