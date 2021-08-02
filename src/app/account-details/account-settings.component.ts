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

import { Component } from '@angular/core';
import { AsyncSubject } from 'rxjs';
import { share, timeout } from 'rxjs/operators';
import { RMM } from '../rmm';
import { AccountSettingsInterface } from '../rmm/account-settings';

@Component({
    selector: 'app-account-settings-component',
    templateUrl: './account-settings.component.html',
    styleUrls: ['account-details.component.scss'],
})
export class AccountSettingsComponent {
    displayedColumns: string[] = ['description', 'status'];
    settings = new AsyncSubject<AccountSettingsInterface[]>();
    settingsArray = [];
    values = {};

    descriptions = {
        empty_trash: 'Automatically delete messages from Trash after 30 days (recommended):',
        empty_spam: 'Automatically delete messages from Spam folder after 30 days (recommended):',
        send_bandwidth_summary: 'Send bandwidth summary when you are close to reaching the limit:',
        send_news_offers: 'Send news about offers from Runbox:',
    };

    constructor(public app: RMM) {}

    async ngOnInit() {
        this.app.account_settings.load().subscribe((settings) => {
            Object.keys(settings.result).forEach((key) =>
                this.settingsArray.push({
                    key: key,
                    description: this.descriptions[key],
                    status: settings.result[key],
                })
            );

            // This will keep the table ordered the same way every time
            this.settingsArray = this.settingsArray.sort((a, b) => (a.key < b.key ? -1 : 1));

            const props = this.settingsArray.map((s) => {
                return s;
            });

            props.reverse();
            this.settings.next(props);
            this.settings.complete();
        });
    }

    change_values(row_obj, setting_value) {
        this.settingsArray.filter((value, key) => {
            if (value.key === row_obj.key) {
                Object.assign(this.values, { [value.key]: setting_value });
            }
        });
    }

    update() {
        const req = this.app.ua.http.post('/rest/v1/account/settings', this.values).pipe(timeout(60000), share());
        req.subscribe((reply) => {
            if (reply['status'] === 'success') {
                this.app.show_error('Settings updated', 'Dismiss');
            } else if (reply['status'] === 'error') {
                const error = reply['field_errors'][Object.keys(reply['field_errors'])[0]];
                this.app.show_error(error, 'Dismiss');
                return;
            }
        });
        return req;
    }
}
