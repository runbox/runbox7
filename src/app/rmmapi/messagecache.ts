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

import { Dexie } from 'dexie';
import { MessageContents } from './rbwebmail';

export class MessageCache {
    db: Dexie;
    message_version = 6;

    constructor(userId: number) {
        // REMOVE THIS CODE AFTER 06-2024, delete old message caches
        new Dexie('messageCache').delete();

        try {
            this.db = new Dexie(`messageCache-${userId}`);
            this.db.version(3).stores({
                // use out-of-line keys, but index "id"
                // yes, empty first arg is deliberate
                messages: ',&id',
            });
        } catch (err) {
            console.log(`Error initializing messagecache: ${err}`);
        }
    }

    async get(id: number): Promise<MessageContents> {
        return this.db?.table('messages').get(id).then(
            result => Object.assign(new MessageContents(), result).version === this.message_version ? result : null,
            _error => null,
        );
    }

    // verify which ids we already have
    async checkIds(ids: number[]): Promise<number[]> {
        return this.db?.table('messages')
            .where('id')
            .anyOf(ids)
            .primaryKeys()
            .then(
                (keys) => keys.map((key) => key as number)
            );
    }

    async getMany(ids: number[]): Promise<MessageContents[]> {
        return this.db?.table('messages')
            .where('id')
            .anyOf(ids)
            .toArray()
            .then(
            result => result,
                _error => null,
            );
    }

    set(id: number, contents: MessageContents): void {
        contents.version = this.message_version;
        this.db?.table('messages').put(contents, id).catch(
            err => {
                console.error(err);
            },
        );
    }

    delete(id: number): void {
        this.db?.table('messages').delete(id).catch(
            err => {
                console.error(err);
            },
        );
    }
}
