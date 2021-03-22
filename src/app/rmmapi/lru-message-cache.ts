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

class CachedMessageContent<T> {
    accessTime: number;
    message:    T;
}

export class LRUMessageCache<T> {
    messages = new Map<number, CachedMessageContent<T>>();

    private eviction: any;

    constructor(
        private maxSize = 100,
        private evictionTimeout = 1000
    ) { }

    add(id: number, message: T) {
        this.messages.set(id, { accessTime: this.now(), message });
        if (this.messages.size > this.maxSize) {
            if (this.eviction) {
                clearTimeout(this.eviction);
            }
            this.eviction = setTimeout(() => this.evictOldest(), this.evictionTimeout);
        }
    }

    get(id: number): T {
        const row = this.messages.get(id);
        if (row) {
            row.accessTime = this.now();
        }
        return row?.message;
    }

    delete(id: number): void {
        this.messages.delete(id);
    }

    private now(): number {
        return (new Date()).getTime();
    }

    private evictOldest(): void {
        const entries = Array.from(this.messages.entries(), e => [e[0], e[1].accessTime]);
        entries.sort((a, b) => b[1] - a[1]);
        for (const e of entries.slice(entries.length - this.maxSize)) {
            this.delete(e[0]);
        }
    }
}
