// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2018 Runbox Solutions AS (runbox.com).
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

import { StorageService } from './storage.service';
import { RunboxWebmailAPI } from './rmmapi/rbwebmail';
import { of, Subject } from 'rxjs';

describe('StorageService', () => {
    const me_1 = { me: of({ uid: 1 }) } as RunboxWebmailAPI;
    const me_2 = { me: of({ uid: 2 }) } as RunboxWebmailAPI;

    it('should share data between instances', async () => {
        const store1 = new StorageService(me_1);
        const store2 = new StorageService(me_1);

        await store1.set('test-key', 42);
        const testVal = await store2.get('test-key');
        expect(testVal).toBe(42, 'store2 can read the data set by store1');
    });

    it('should store data in a user-specific location', async () => {
        const user1 = new StorageService(me_1);
        await user1.set('test-key', 42);
        let testVal = await user1.get('test-key');
        expect(testVal).toBe(42, 'user1 get the data they set');

        const user2 = new StorageService(me_2);
        testVal = await user2.get('test-key');
        expect(testVal).toBe(undefined, 'user2 should not get the data of user1');
    });

    it('setting undefined should erase entry', async () => {
        const user1 = new StorageService(me_1);
        await user1.set('test-key', 42);
        let testVal = await user1.get('test-key');
        expect(testVal).toBe(42, 'user1 get the data they set');

        user1.set('test-key', undefined);
        testVal = await user1.get('test-key');
        expect(testVal).toBe(undefined, 'user1 can erase their data');
    });

    it('should serialize complex data structures', async () => {
        const user1 = new StorageService(me_1);
        await user1.set('test-key', { foo: { bar: ['baz', 42] } });
        const testVal = await user1.get('test-key');
        expect(testVal.foo.bar[1]).toBe(42, 'object get serialized and deserialized correctly');
    });

    it('should notify listeners about value changes', async () => {
        const user1 = new StorageService(me_1);

        function runAsyncTasks() {
            // hopefully anyway :)
            return new Promise(r => setTimeout(() => r(null), 0));
        }

        user1.set('notify-key', undefined);
        await runAsyncTasks();
        const listener1 = [];

        // listener is notified about existing state ASAP
        user1.getSubject('notify-key').subscribe(val => listener1.push(val));
        await runAsyncTasks();

        expect(listener1.length).toBe(1);
        expect(listener1[0]).toBe(undefined);

        user1.set('notify-key', true);
        await runAsyncTasks();
        expect(listener1.length).toBe(2);
        expect(listener1[1]).toBe(true);

        // old users don't get re-notified on new users
        const listener2 = [];
        user1.getSubject('notify-key').subscribe(val => listener2.push(val));
        await runAsyncTasks();
        expect(listener1.length).toBe(2);
        expect(listener2.length).toBe(1);
        expect(listener2[0]).toBe(true);

        // both listeners get notified when a new value is set
        await user1.set('notify-key', false);
        await runAsyncTasks();
        expect(listener1.length).toBe(3);
        expect(listener2.length).toBe(2);
        expect(listener1[2]).toBe(false);
        expect(listener2[1]).toBe(false);
    });

    describe('RxJS AsyncSubject integration', () => {
        it('should handle get/set operations that depend on uid AsyncSubject', async () => {
            const me$ = new Subject<{ uid: number }>();
            const api = { me: me$.asObservable() } as any;

            const store = new StorageService(api);

            // Start get operation before uid is loaded
            const getPromise = store.get('test-key');

            // Now emit uid (simulating API response)
            me$.next({ uid: 42 });
            me$.complete();

            // The get operation should resolve after uid is loaded
            // Note: since key doesn't exist, it will be undefined
            const result = await getPromise;
            expect(result).toBeUndefined();

            // Now set a value
            await store.set('test-key', 'stored-value');

            // Verify it was stored with user-scoped key
            const storedValue = localStorage.getItem('42:test-key');
            expect(storedValue).toBe('"stored-value"');

            // Get should return the value
            const retrieved = await store.get('test-key');
            expect(retrieved).toBe('stored-value');
        });

        it('should handle concurrent get/set operations before uid is loaded', async () => {
            const me$ = new Subject<{ uid: number }>();
            const api = { me: me$.asObservable() } as any;

            const store = new StorageService(api);

            // Start multiple operations before uid is loaded
            const promises = [
                store.set('key1', 'value1'),
                store.set('key2', 'value2'),
                store.get('key1'),
                store.get('key2'),
            ];

            // Now emit uid
            me$.next({ uid: 123 });
            me$.complete();

            // All operations should complete successfully
            await Promise.all(promises);

            // Verify values were stored correctly
            expect(await store.get('key1')).toBe('value1');
            expect(await store.get('key2')).toBe('value2');
            expect(localStorage.getItem('123:key1')).toBe('"value1"');
            expect(localStorage.getItem('123:key2')).toBe('"value2"');
        });

        it('should correctly scope keys by user uid', async () => {
            const me1$ = new Subject<{ uid: number }>();
            const me2$ = new Subject<{ uid: number }>();
            const api1 = { me: me1$.asObservable() } as any;
            const api2 = { me: me2$.asObservable() } as any;

            const store1 = new StorageService(api1);
            const store2 = new StorageService(api2);

            // Set values before uids are loaded
            const set1 = store1.set('shared-key', 'user1-value');
            const set2 = store2.set('shared-key', 'user2-value');

            // Emit different uids
            me1$.next({ uid: 100 });
            me1$.complete();
            me2$.next({ uid: 200 });
            me2$.complete();

            await Promise.all([set1, set2]);

            // Each user should have their own scoped value
            expect(await store1.get('shared-key')).toBe('user1-value');
            expect(await store2.get('shared-key')).toBe('user2-value');

            // Verify localStorage keys are properly scoped
            expect(localStorage.getItem('100:shared-key')).toBe('"user1-value"');
            expect(localStorage.getItem('200:shared-key')).toBe('"user2-value"');
        });
    });

    describe('RxJS ReplaySubject integration (getSubject)', () => {
        it('should provide ReplaySubject that caches the current value', async () => {
            const store = new StorageService(me_1);

            // Set a value
            await store.set('cache-test', 'cached-value');

            // Get the subject - it should immediately emit the cached value
            const values: any[] = [];
            store.getSubject('cache-test').subscribe(v => values.push(v));

            // Wait for async get to complete
            await new Promise(r => setTimeout(r, 10));

            // Should have received the cached value
            expect(values.length).toBe(1);
            expect(values[0]).toBe('cached-value');
        });

        it('should update ReplaySubject when value changes', async () => {
            const store = new StorageService(me_1);

            const values: any[] = [];
            store.getSubject('update-test').subscribe(v => values.push(v));

            await new Promise(r => setTimeout(r, 10));
            expect(values.length).toBe(1);
            expect(values[0]).toBeUndefined();

            // Update the value
            await store.set('update-test', 'new-value');
            await new Promise(r => setTimeout(r, 10));

            // Should have received update
            expect(values.length).toBe(2);
            expect(values[1]).toBe('new-value');
        });

        it('should share same ReplaySubject for multiple subscribers', async () => {
            const store = new StorageService(me_1);

            await store.set('shared-test', 'shared-value');

            const values1: any[] = [];
            const values2: any[] = [];

            const subject = store.getSubject('shared-test');
            subject.subscribe(v => values1.push(v));
            subject.subscribe(v => values2.push(v));

            await new Promise(r => setTimeout(r, 10));

            // Both subscribers should get the same cached value
            expect(values1).toEqual(['shared-value']);
            expect(values2).toEqual(['shared-value']);
        });
    });
});
