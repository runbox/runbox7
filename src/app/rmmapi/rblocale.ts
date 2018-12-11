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

import { Injectable } from '@angular/core';

@Injectable()
export class RunboxLocale {
    private locales_avail = {
       'com': '/locale/en_US.js',
        'no': '/locale/nb_NO.js'
    };

    private tld = window.location.hostname.replace(/(.+\.)/, '');
    public locale;

    constructor() {
        this.load();
    }

    public load() {
        const url = this.locales_avail[this.tld];
        const locale_elem = document.createElement('script');
        locale_elem.setAttribute('src', url ? url : this.locales_avail['com']);
        document.head.appendChild(locale_elem);
    }

    public translate(key) {
        let translated = key;
        try {
            translated = window['getLocale'](key.split('.'));
        } catch (ex) {
            console.log('locale translations not found');
        }
        return translated;
    }
}
