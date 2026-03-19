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

import { AsyncSubject, ReplaySubject, firstValueFrom } from 'rxjs';

/**
 * Tests for StorageService RxJS patterns.
 *
 * Tests the AsyncSubject uid pattern and ReplaySubject keySubjects pattern
 * used in storage.service.ts.
 */
describe('StorageService RxJS Patterns', () => {
    describe('UID AsyncSubject Pattern', () => {
        it('should resolve uid after API call', async () => {
            const uid = new AsyncSubject<number>();

            // Simulate rmmapi.me.subscribe callback
            setTimeout(() => {
                uid.next(12345);
                uid.complete();
            }, 5);

            const result = await firstValueFrom(uid);
            expect(result).toBe(12345);
        });

        it('should throw EmptyError if complete() without next()', async () => {
            const uid = new AsyncSubject<number>();
            uid.complete();

            await expectAsync(firstValueFrom(uid))
                .toBeRejectedWithError('no elements in sequence');
        });

        it('should allow multiple consumers of uid', async () => {
            const uid = new AsyncSubject<number>();
            uid.next(999);
            uid.complete();

            const [result1, result2] = await Promise.all([
                firstValueFrom(uid),
                firstValueFrom(uid),
            ]);

            expect(result1).toBe(999);
            expect(result2).toBe(999);
        });
    });

    describe('userKey async method', () => {
        it('should construct user-scoped key', async () => {
            const uid = new AsyncSubject<number>();
            uid.next(42);
            uid.complete();

            const userId = await firstValueFrom(uid);
            const key = `${userId}:shoppingCart`;

            expect(key).toBe('42:shoppingCart');
        });
    });

    describe('getSubject ReplaySubject Pattern', () => {
        it('should return ReplaySubject for key', async () => {
            const keySubjects: { [key: string]: ReplaySubject<unknown> } = {};

            const getSubject = (key: string): ReplaySubject<unknown> => {
                if (!keySubjects[key]) {
                    keySubjects[key] = new ReplaySubject<unknown>(1);
                    // Simulate async get
                    setTimeout(() => keySubjects[key].next('stored-value'), 5);
                }
                return keySubjects[key];
            };

            const subject = getSubject('testKey');
            const result = await firstValueFrom(subject);

            expect(result).toBe('stored-value');
        });

        it('should cache subject per key', async () => {
            const keySubjects: { [key: string]: ReplaySubject<unknown> } = {};

            const getSubject = (key: string): ReplaySubject<unknown> => {
                if (!keySubjects[key]) {
                    keySubjects[key] = new ReplaySubject<unknown>(1);
                    keySubjects[key].next(`value-for-${key}`);
                }
                return keySubjects[key];
            };

            const subject1 = getSubject('key1');
            const subject2 = getSubject('key1'); // Same key

            expect(subject1).toBe(subject2);
        });

        it('should handle concurrent get/set operations', async () => {
            const keySubjects: { [key: string]: ReplaySubject<unknown> } = {};

            const getSubject = (key: string): ReplaySubject<unknown> => {
                if (!keySubjects[key]) {
                    keySubjects[key] = new ReplaySubject<unknown>(1);
                }
                return keySubjects[key];
            };

            const subject = getSubject('concurrent');
            subject.next('initial');

            // Concurrent reads
            const [result1, result2] = await Promise.all([
                firstValueFrom(subject),
                firstValueFrom(subject),
            ]);

            expect(result1).toBe('initial');
            expect(result2).toBe('initial');
        });
    });

    describe('set() with subject update', () => {
        it('should update subject when value is set', async () => {
            const keySubjects: { [key: string]: ReplaySubject<unknown> } = {};
            keySubjects['test'] = new ReplaySubject<unknown>(1);
            keySubjects['test'].next('old-value');

            // Simulate set operation
            const newValue = 'new-value';
            keySubjects['test'].next(newValue);

            const result = await firstValueFrom(keySubjects['test']);
            expect(result).toBe('new-value');
        });

        it('should handle undefined values', async () => {
            const keySubjects: { [key: string]: ReplaySubject<unknown> } = {};
            keySubjects['test'] = new ReplaySubject<unknown>(1);
            keySubjects['test'].next('existing');

            // Simulate set with undefined (remove)
            keySubjects['test'].next(undefined);

            const result = await firstValueFrom(keySubjects['test']);
            expect(result).toBeUndefined();
        });
    });
});
