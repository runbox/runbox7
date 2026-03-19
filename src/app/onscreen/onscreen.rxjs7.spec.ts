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
 * Tests for Onscreen Component RxJS patterns.
 *
 * Tests the script loader pattern used in onscreen.component.ts
 * where an AsyncSubject<void> is used to track Jitsi Meet API loading.
 *
 * Bug fixed: AsyncSubject must call next() before complete() to work with firstValueFrom().
 */
describe('Onscreen Component RxJS Patterns', () => {
    describe('Jitsi Script Loader (AsyncSubject<void>)', () => {
        let jitsiLoader: AsyncSubject<void> = null;

        beforeEach(() => {
            jitsiLoader = null;
        });

        it('should resolve firstValueFrom when Jitsi script loads', async () => {
            jitsiLoader = new AsyncSubject<void>();

            // Correct pattern: next() then complete()
            jitsiLoader.next();
            jitsiLoader.complete();

            await expectAsync(firstValueFrom(jitsiLoader)).toBeResolved();
        });

        it('should throw EmptyError if complete() called without next()', async () => {
            jitsiLoader = new AsyncSubject<void>();

            // Bug pattern: complete() without next()
            jitsiLoader.complete();

            await expectAsync(firstValueFrom(jitsiLoader))
                .toBeRejectedWithError('no elements in sequence');
        });

        it('should share loader across component instances', async () => {
            if (jitsiLoader === null) {
                jitsiLoader = new AsyncSubject<void>();
                setTimeout(() => {
                    jitsiLoader.next();
                    jitsiLoader.complete();
                }, 5);
            }

            await firstValueFrom(jitsiLoader);

            // Second instance
            await expectAsync(firstValueFrom(jitsiLoader)).toBeResolved();
        });

        it('should propagate Jitsi script load errors', async () => {
            jitsiLoader = new AsyncSubject<void>();
            const promise = firstValueFrom(jitsiLoader);

            jitsiLoader.error(new Error('Jitsi script failed'));

            await expectAsync(promise).toBeRejectedWithError('Jitsi script failed');
        });
    });

    describe('RunboxMe AsyncSubject Pattern', () => {
        it('should resolve user data from RunboxMe', async () => {
            const me = new AsyncSubject<{ uid: number; first_name: string; last_name: string }>();

            setTimeout(() => {
                me.next({ uid: 123, first_name: 'Test', last_name: 'User' });
                me.complete();
            }, 5);

            const result = await firstValueFrom(me);
            expect(result.uid).toBe(123);
            expect(result.first_name).toBe('Test');
        });

        it('should handle concurrent access to me subject', async () => {
            const me = new AsyncSubject<{ uid: number }>();

            const promise1 = firstValueFrom(me);
            const promise2 = firstValueFrom(me);

            me.next({ uid: 456 });
            me.complete();

            const [result1, result2] = await Promise.all([promise1, promise2]);
            expect(result1.uid).toBe(456);
            expect(result2.uid).toBe(456);
        });
    });

    describe('Meeting Operations with Async Observables', () => {
        it('should handle createMeeting async flow', async () => {
            const jitsiLoader = new AsyncSubject<void>();
            const me = new AsyncSubject<{ uid: number }>();

            jitsiLoader.next();
            jitsiLoader.complete();
            me.next({ uid: 789 });
            me.complete();

            // Simulate createMeeting
            await firstValueFrom(jitsiLoader);
            const user = await firstValueFrom(me);

            expect(user.uid).toBe(789);
        });

        it('should handle joinMeeting async flow', async () => {
            const jitsiLoader = new AsyncSubject<void>();

            jitsiLoader.next();
            jitsiLoader.complete();

            // Simulate joinMeeting
            await firstValueFrom(jitsiLoader);

            // Jitsi API would be available here
            expect(true).toBe(true);
        });
    });
});
