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
import { HttpClient } from '@angular/common/http';
import { AppSettings } from '../app-settings';
import { SearchService } from '../xapian/searchservice';
import { PreferencesService } from '../common/preferences.service';

@Injectable({ providedIn: 'root' })
export class UsageReportsService {
    lastReportFor = new Map<string, number>();
    preferences: Map<string, any> = new Map();

    constructor(
        private http: HttpClient,
        public preferenceService: PreferencesService,
        private searchService: SearchService,
    ) {
        this.preferenceService.preferences.subscribe((prefs) => {
            this.preferences = prefs;
        });
        setInterval(() => this.gatherStats(), 15 * 60 * 1000);
        this.gatherStats();
    }

    public report(key: string) {
        const now = (new Date()).getTime();
        // make sure we're not reporting anything more often than once an hour
        if ((this.lastReportFor[key] || 0) + 3600 < now) {
            this.lastReportFor[key] = now;
            // we don't care about the result, but we need to make sure HttpClient actually sends it,
            // hence the silly-looking empty subscribe
            this.http.post('/rest/v1/usage/report/' + key, {}).subscribe(() => {});
        }
    }

    private gatherStats() {
        if (this.preferences.get(`${this.preferenceService.prefGroup}:showPopularRecipients`)) {
            this.report('popularRecipients');
        }
        if (this.preferences.get(`${this.preferenceService.prefGroup}:avatarSource`) === AppSettings.AvatarSource.REMOTE) {
            this.report('remoteAvatars');
        }
        if (this.searchService.localSearchActivated) {
            this.report('usesLocalIndex');
        }
        if (this.preferences.get(`${this.preferenceService.prefGroup}:rmm7showhtmldecision`) === 'alwaysshowhtml') {
            this.report('alwaysShowHtmlEmails');
        }
    }

}
