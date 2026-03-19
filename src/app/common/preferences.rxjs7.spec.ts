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

import { ReplaySubject, AsyncSubject, firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';

/**
 * Tests for PreferencesService RxJS patterns.
 *
 * Tests the ReplaySubject pattern used in preferences.service.ts
 * where a ReplaySubject(1) caches preference data.
 */
describe('PreferencesService RxJS Patterns', () => {
    describe('ReplaySubject(1) for Preferences Cache', () => {
        it('should resolve firstValueFrom when preferences are loaded', async () => {
            const preferences = new ReplaySubject<Map<string, unknown>>(1);
            const prefs = new Map([['Global:theme', 'dark']]);

            preferences.next(prefs);

            const result = await firstValueFrom(preferences);
            expect(result.get('Global:theme')).toBe('dark');
        });

        it('should wait for initial preferences load', async () => {
            const preferences = new ReplaySubject<Map<string, unknown>>(1);
            const promise = firstValueFrom(preferences);

            const prefs = new Map([['Global:language', 'en']]);
            setTimeout(() => preferences.next(prefs), 10);

            const result = await promise;
            expect(result.get('Global:language')).toBe('en');
        });

        it('should cache and replay last preferences value', async () => {
            const preferences = new ReplaySubject<Map<string, unknown>>(1);

            preferences.next(new Map([['key1', 'value1']]));
            preferences.next(new Map([['key2', 'value2']]));

            const result = await firstValueFrom(preferences);
            expect(result.get('key2')).toBe('value2');
        });

        it('should provide same value to multiple subscribers', async () => {
            const preferences = new ReplaySubject<Map<string, unknown>>(1);
            const prefs = new Map([['shared', 'value']]);

            preferences.next(prefs);

            const [result1, result2, result3] = await Promise.all([
                firstValueFrom(preferences),
                firstValueFrom(preferences),
                firstValueFrom(preferences),
            ]);

            expect(result1.get('shared')).toBe('value');
            expect(result2.get('shared')).toBe('value');
            expect(result3.get('shared')).toBe('value');
        });
    });

    describe('set() with pipe(take(1)) Pattern', () => {
        it('should get current value with pipe(take(1))', async () => {
            const preferences = new ReplaySubject<Map<string, unknown>>(1);
            preferences.next(new Map([['existing', 'data']]));

            const current = await firstValueFrom(preferences.pipe(take(1)));
            expect(current.get('existing')).toBe('data');
        });

        it('should update and emit new preferences', async () => {
            const preferences = new ReplaySubject<Map<string, unknown>>(1);
            const initial = new Map([['key', 'initial']]);
            preferences.next(initial);

            // Simulate set() operation
            const current = await firstValueFrom(preferences.pipe(take(1)));
            current.set('key', 'updated');
            preferences.next(current);

            const result = await firstValueFrom(preferences);
            expect(result.get('key')).toBe('updated');
        });
    });

    describe('mergeDeviceGlobal Async Flow', () => {
        it('should merge preferences from server with local cache', async () => {
            const preferences = new ReplaySubject<Map<string, unknown>>(1);

            // Local cache
            preferences.next(new Map([['local:setting', 'local-value']]));

            // Wait for local, then merge with server data
            const allPrefs = await firstValueFrom(preferences);

            // Simulate server data merge
            allPrefs.set('Global:serverSetting', 'server-value');
            preferences.next(allPrefs);

            const result = await firstValueFrom(preferences);
            expect(result.get('local:setting')).toBe('local-value');
            expect(result.get('Global:serverSetting')).toBe('server-value');
        });
    });

    describe('Concurrent set() Operations', () => {
        it('should handle sequential set() calls', async () => {
            const preferences = new ReplaySubject<Map<string, unknown>>(1);
            preferences.next(new Map());

            // Sequential sets
            for (let i = 0; i < 5; i++) {
                const current = await firstValueFrom(preferences.pipe(take(1)));
                current.set(`key${i}`, `value${i}`);
                preferences.next(current);
            }

            const result = await firstValueFrom(preferences);
            expect(result.size).toBe(5);
            expect(result.get('key4')).toBe('value4');
        });
    });

    describe('Storage UID AsyncSubject Pattern', () => {
        it('should resolve uid from AsyncSubject', async () => {
            const uid = new AsyncSubject<number>();

            setTimeout(() => {
                uid.next(42);
                uid.complete();
            }, 5);

            const result = await firstValueFrom(uid);
            expect(result).toBe(42);
        });

        it('should allow late subscribers to get uid', async () => {
            const uid = new AsyncSubject<number>();
            uid.next(99);
            uid.complete();

            const result = await firstValueFrom(uid);
            expect(result).toBe(99);
        });
    });
});
