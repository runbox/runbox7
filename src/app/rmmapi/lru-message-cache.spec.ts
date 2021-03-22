// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2021 Runbox Solutions AS (runbox.com).
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

import { LRUMessageCache } from './lru-message-cache';

describe('LRU message cache', () => {
    it('should not evict old messages if they do not exceed the max size', async () => {
        const cache = new LRUMessageCache<boolean>(3, 100);
        cache.add(1, true);
        cache.add(2, true);
        cache.add(3, true);
        await new Promise(resolve => setTimeout(resolve, 200));
        expect(cache.get(1)).toBe(true);
        expect(cache.get(2)).toBe(true);
        expect(cache.get(3)).toBe(true);
    });

    it('should evict old messages after a while', async () => {
        const cache = new LRUMessageCache<boolean>(3, 100);
        cache.add(1, true);
        cache.add(2, true);
        cache.add(3, true);
        cache.add(4, true);
        cache.add(5, true);
        cache.add(6, true);

        // refreshes the LRU counter, keeping them even ones alive longer
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(cache.get(2)).toBe(true);
        expect(cache.get(4)).toBe(true);
        expect(cache.get(6)).toBe(true);

        await new Promise(resolve => setTimeout(resolve, 150));
        expect(cache.get(1)).toBeFalsy();
        expect(cache.get(3)).toBeFalsy();
        expect(cache.get(5)).toBeFalsy();

        expect(cache.get(2)).toBe(true);
        expect(cache.get(4)).toBe(true);
        expect(cache.get(6)).toBe(true);
    });
});
