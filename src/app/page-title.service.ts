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
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

const titleBySubApp = new Map([
    ['account', 'Account'],
    ['calendar', 'Calendar'],
    ['changelog', 'Changelog'],
    ['compose', 'Compose'],
    ['contacts', 'Contacts'],
    ['dev', 'Components'],
    ['dkim', 'DKIM'],
    ['help', 'Help'],
    ['login', 'Login'],
    ['onscreen', 'Video meeting'],
    ['overview', 'Overview'],
    ['start', 'Overview'],
    ['welcome', 'Welcome'],
]);

export function buildRunboxPageTitle(url: string): string {
    const path = url.split(/[?#]/)[0];
    const segments = path
        .split('/')
        .filter((segment) => segment && !['app', 'appdev', 'index_dev.html'].includes(segment));
    const subAppTitle = titleBySubApp.get(segments[0]) || 'Mail';

    return `${subAppTitle} - Runbox 7`;
}

@Injectable()
export class PageTitleService {
    constructor(router: Router, private title: Title) {
        this.updateTitle(router.url);
        router.events
            .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
            .subscribe((event) => this.updateTitle(event.urlAfterRedirects));
    }

    private updateTitle(url: string) {
        this.title.setTitle(buildRunboxPageTitle(url));
    }
}
