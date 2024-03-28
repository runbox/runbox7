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

export class Alias {
    public profiles: any;
    public aliases: any;
    public aliases_unique: any;
    public aliases_counter: any;
    constructor(
        public app: RMM,
    ) {
    }
    load(): Observable<any> {
        this.app.ua.http.get('/rest/v1/aliases/limits').subscribe(
            res => {
                this.aliases_counter = {
                    total: res['result'].total,
                    current: res['result'].current,
                };
            },
            error => {
                return this.app.show_error('Could not load alias limits', 'Dismiss');
            }
        );

        const req = this.app.ua.http.get('/rest/v1/aliases', {}).pipe(timeout(60000), share());
        req.subscribe(
            reply => {
                if ( reply['status'] === 'error' ) {
                    this.app.show_error( reply['error'].join( '' ), 'Dismiss' );
                    return;
                }
                this.aliases = reply['result'].aliases;
                const _unique = {};
                for ( const value of this.aliases ) {
                    _unique[ value.localpart + '@' + value.domain ] = 1;
                }
                this.aliases_unique = Object.keys(_unique);
                return;
            },
            error => {
                return this.app.show_error('Could not load aliases.', 'Dismiss');
            }
        );
        return req;
    }
    create(obj, field_errors) {
        const req = this.app.ua.http.post('/rest/v1/alias/', obj).pipe(timeout(60000), share());
        req.subscribe(
          data => {
            const reply = data;
            this.app.handle_field_errors(reply, field_errors);
          },
          error => {
            this.app.show_error('Could not load aliases.', 'Dismiss');
          }
        );
        return req;
    }
    delete(id) {
        const req = this.app.ua.http.delete('/rest/v1/alias/' + id).pipe(timeout(60000), share());
        req.subscribe(data => {
            const reply = data;
            if ( reply['status'] === 'error' ) {
                this.app.handle_errors( reply );
            }
        });
        return req;
    }
    update(id, values, field_errors) {
        const req = this.app.ua.http.put('/rest/v1/alias/' + id, values).pipe(timeout(60000), share());
        req.subscribe(
          data => {
            const reply = data;
            this.app.handle_field_errors(reply, field_errors);
          },
          error => {
            this.app.show_error('Could not load profiles.', 'Dismiss');
          }
        );
        return req;
    }
    validate(obj) {
        const req = this.app.ua.http.post('/rest/v1/alias/' + obj.id + '/validate_email/', obj).pipe(timeout(60000), share());
        req.subscribe(
          _data => {
          },
          error => {
            this.app.show_error('Could not validate aliases.', 'Dismiss');
          }
        );
        return req;
    }
}
