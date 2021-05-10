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
import { timeout, share } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { RMM } from '../rmm';

export interface AccountSettingsInterface {
    runbox_offers: boolean;
    bandwidth_summary: boolean;
    delete_trash: boolean;
    detele_spam: boolean;
}

export class AccountSettings {
    settings: AccountSettingsInterface;
    is_busy = false;

    constructor(public app: RMM) {}

    load(): Observable<any> {
        this.is_busy = true;
        const req = this.app.http.get('/rest/v1/account/settings', {}).pipe(timeout(60000), share());
        req.subscribe(
            (reply) => {
                this.is_busy = false;
                if (reply['status'] === 'success') {
                    this.settings = reply['result'];
                } else if (reply['status'] === 'error') {
                    this.app.show_error(reply['error'].join(''), 'Dismiss');
                    return;
                }
            },
            (error) => {
                this.is_busy = false;
                return this.app.show_error('Could not load account preferences', 'Dismiss');
            }
        );
        return req;
    }

    update(id: number, values: any): Observable<any> {
        const req = this.app.http.put('/rest/v1/account/settings/' + id, values).pipe(timeout(60000), share());
        req.subscribe(
            (reply) => {
                this.is_busy = false;
                if (reply['status'] === 'error') {
                    this.app.show_error(reply['error'].join(''), 'Dismiss');
                    return;
                }
            },
            (error) => {
                this.is_busy = false;
                return this.app.show_error('Could not update account preferences', 'Dismiss');
            }
        );
        return req;
    }
}
