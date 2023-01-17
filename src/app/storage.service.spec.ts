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
import { of } from 'rxjs';

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
});
