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
import { Observable } from 'rxjs/Rx';
import { of } from 'rxjs';
import { RMM } from '../rmm';

export class RunboxDomain {
    public profiles: any;
    is_busy = false;
    data;
    constructor(
        public app: RMM,
    ) {
    }
    load(): Observable<any> {
        if ( this.data || this.is_busy ) { return of(this.data); }
        this.is_busy = true;
        const req = this.app.ua.http.get('/rest/v1/runbox_domains', {}).pipe(timeout(60000), share());
        req.subscribe(
          data => {
            this.is_busy = false;
            const reply = data;
            this.data = reply['results'];
            return;
          },
          error => {
            this.is_busy = false;
            this.load();
            return this.app.show_error('Could not load runbox_domains endpoint.', 'Dismiss');
          }
        );
        return req;
    }
}
