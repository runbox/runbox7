// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2020 Runbox Solutions AS (runbox.com).
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

import { Injectable } from '@angular/core';
import { Md5 } from 'ts-md5/dist/md5';

interface Entry {
    url:       string|null;
    timestamp: number;
}

@Injectable()
export class AvatarService {
    avatarCache: { [email: string]: Entry } = {};

    /* This caches avatar URLs, or `null`s in their absence
     *
     * Putting (gr)avatar URLs in <img src's> will cache them nicely,
     * except if they 404d last time around
     * (which will realistically happen most of the time).
     *
     * 404d avatars will get re-requested every single time,
     * wasting time and bandwidth for more and more useless 404s.
     * To avoid this, we cache the fact that they don't exist
     * (storing `null` in `avatarCache`) so that various components
     * know that there's no need to create <img> at all,
     * and no useless requests will be performed.
     */

    constructor() {
        const stored = localStorage.getItem('rmm7avatarCache');
        this.avatarCache = stored ? JSON.parse(stored) : {};
    }

    private storeCache() {
        localStorage.setItem('rmm7avatarCache', JSON.stringify(this.avatarCache));
    }

    // returns an URL or null if no avatar is available
    async avatarUrlFor(email: string): Promise<string> {
        // TODO: skip if timestamp too old
        if (this.avatarCache[email]) {
            return Promise.resolve(this.avatarCache[email].url);
        }

        const hash = Md5.hashStr(email.toLowerCase());
        const url = 'https://gravatar.com/avatar/' + hash + '?d=404';

        return fetch(url).then(response => {
            const resolvedUrl = response.ok ? url : null;
            this.avatarCache[email] = { url: resolvedUrl, timestamp: (new Date()).getTime() };
            this.storeCache();
            return Promise.resolve(this.avatarCache[email].url);
        });
    }
}
