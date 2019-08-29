// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2019 Runbox Solutions AS (runbox.com).
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

import { RunboxWebmailAPI } from './rmmapi/rbwebmail';
import { Injectable } from '@angular/core';
import { AsyncSubject } from 'rxjs';

@Injectable()
export class StorageService {
    uid = new AsyncSubject<number>();

    constructor(
        private rmmapi: RunboxWebmailAPI,
    ) {
        rmmapi.me.subscribe(me => {
            this.uid.next(me.uid);
            this.uid.complete();
        });
    }

    private async userKey(key: string): Promise<string> {
        const uid = await this.uid.toPromise();
        return `${uid}:${key}`;
    }

    async get(key: string): Promise<any> {
        const value = localStorage.getItem(await this.userKey(key));
        return value ? JSON.parse(value) : undefined;
    }

    async set(key: string, value: any): Promise<void> {
        if (value === undefined) {
            localStorage.removeItem(await this.userKey(key));
        } else {
            const valueStr = JSON.stringify(value);
            localStorage.setItem(await this.userKey(key), valueStr);
        }
    }
}
