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

export class AccountSecuritySession {
    public results: any;
    user_password: string;
    is_busy = false;

    constructor(
        public app: RMM,
    ) {
    }

    list(): Observable<any> {
        this.is_busy = true;
        const data = {
        };
        const req = this.app.ua.http.get('/ajax/ajax_mfa_list_sessions', data)
            .pipe(timeout(60000), share());
        req.subscribe(
          reply => {
            this.is_busy = false;
            if ( reply['status'] === 'error' ) {
                this.app.show_error( reply['error'].join( '' ), 'Dismiss' );
                return;
            }
            this.results = reply['sessions'];
            return;
          },
          error => {
            this.is_busy = false;
            return this.app.show_error('Could not list sessions.', 'Dismiss');
          }
        );
        return req;
    }
}
