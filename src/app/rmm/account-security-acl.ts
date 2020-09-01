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

export class AccountSecurityACL {
    user_password: string;
    is_busy = false;
    results_logins_list: any;
    results_rules: any;
    results_blocked: any;
    results_accounts_affected: any;

    constructor(
        public app: RMM,
    ) {
    }

    accounts_affected() {
        this.is_busy = true;
        const data = {};
        const req = this.app.ua.http.get('/rest/v1/acl/accounts_affected/', data).pipe(timeout(60000), share());
        req.subscribe(
          reply => {
            this.is_busy = false;
            if ( reply['status'] === 'error' ) {
                this.app.show_error( reply['error'].join( '' ), 'Dismiss' );
                return;
            }
            this.results_accounts_affected = reply['result'].usernames || [];
            return;
          },
          error => {
            this.is_busy = false;
            return this.app.show_error('Could not load accounts related to this setting.', 'Dismiss');
          }
        );
        return req;
    }

    update_sub_account(data): Observable<any> {
        this.is_busy = true;
        data = data || {
        };
        const req = this.app.ua.http.put('/rest/v1/acl/subaccount_rules/', data).pipe(timeout(60000), share());
        req.subscribe(
          reply => {
            this.is_busy = false;
            if ( reply['status'] === 'error' ) {
                this.app.show_error( reply['error'].join( '' ), 'Dismiss' );
                return;
            }
            return;
          },
          error => {
            this.is_busy = false;
            return this.app.show_error('Could not update subaccount rules.', 'Dismiss');
          }
        );
        return req;
    }

    blocked_list(): Observable<any> {
        this.is_busy = true;
        const req = this.app.ua.http.get('/rest/v1/acl/blocked', {}).pipe(timeout(60000), share());
        req.subscribe(
          reply => {
            this.is_busy = false;
            if ( reply['status'] === 'error' ) {
                this.app.show_error( reply['error'].join( '' ), 'Dismiss' );
                return;
            }
            this.results_blocked = reply['blocked_ips'];
            console.log('BLOCKED IPS', reply);
            return;
          },
          error => {
            this.is_busy = false;
            return this.app.show_error('Could not list blocked ips.', 'Dismiss');
          }
        );
        return req;
    }

    unblock(data): Observable<any> {
        this.is_busy = true;
        data = data || {
        };
        const req = this.app.ua.http.put('/rest/v1/acl/unblock', data).pipe(timeout(60000), share());
        req.subscribe(
          reply => {
            this.is_busy = false;
            if ( reply['status'] === 'error' ) {
                this.app.show_error( reply['error'].join( '' ), 'Dismiss' );
                return;
            }
            this.blocked_list();
            return;
          },
          error => {
            this.is_busy = false;
            return this.app.show_error('Could not unblock.', 'Dismiss');
          }
        );
        return req;
    }

    update(data): Observable<any> {
        this.is_busy = true;
        data = data || {
        };
        const req = this.app.ua.http.post('/rest/v1/acl/rule', data).pipe(timeout(60000), share());
        req.subscribe(
          reply => {
            this.is_busy = false;
            if ( reply['status'] === 'error' ) {
                this.app.show_error( reply['error'].join( '' ), 'Dismiss' );
                return;
            }
            return;
          },
          error => {
            this.is_busy = false;
            return this.app.show_error('Could not update rules.', 'Dismiss');
          }
        );
        return req;
    }

    list(data): Observable<any> {
        this.is_busy = true;
        data = data || {};
        const req = this.app.ua.http.get('/rest/v1/acl/rules', data).pipe(timeout(60000), share());
        req.subscribe(
          reply => {
            this.is_busy = false;
            if ( reply['status'] === 'error' ) {
                this.app.show_error( reply['error'].join( '' ), 'Dismiss' );
                return;
            }
            this.results_rules = reply['rules'];
            return;
          },
          error => {
            this.is_busy = false;
            return this.app.show_error('Could not list rules.', 'Dismiss');
          }
        );
        return req;
    }

    remove_rule(data): Observable<any> {
        this.is_busy = true;
        const req = this.app.ua.http.put('/rest/v1/acl/remove_rule/' + data.id, data).pipe(timeout(60000), share());
        req.subscribe(
          reply => {
            this.is_busy = false;
            if ( reply['status'] === 'error' ) {
                this.app.show_error( reply['error'].join( '' ), 'Dismiss' );
                return;
            }
            return;
          },
          error => {
            this.is_busy = false;
            return this.app.show_error('Could not delete rule.', 'Dismiss');
          }
        );
        return req;
    }

    create_rule(data): Observable<any> {
        this.is_busy = true;
        data = data || {
        };
        const req = this.app.ua.http.post('/rest/v1/acl/rule', data).pipe(timeout(60000), share());
        req.subscribe(
          reply => {
            this.is_busy = false;
            if ( reply['status'] === 'error' ) {
                this.app.show_error( reply['error'].join( '' ), 'Dismiss' );
                return;
            }
            return;
          },
          error => {
            this.is_busy = false;
            return this.app.show_error('Could not update rule.', 'Dismiss');
          }
        );
        return req;
    }

    logins_list(data): Observable<any> {
        this.is_busy = true;
        const url = new URL('https://www.runbox.com');
        url.pathname = '/rest/v1/acl/logins';
        Object.keys(data).forEach((key) => {
            url.searchParams.set(key, encodeURI(data[key]));
        });
        const req = this.app.ua.http.get([url.pathname, url.searchParams.toString()].join('?'), {}).pipe(timeout(60000), share());
        req.subscribe(
          reply => {
            this.is_busy = false;
            if ( reply['status'] === 'error' ) {
                this.app.show_error( reply['error'].join( '' ), 'Dismiss' );
                return;
            }
            this.results_logins_list = reply['last_logins'];
            return;
          },
          error => {
            this.is_busy = false;
            return this.app.show_error('Could not list last logins.', 'Dismiss');
          }
        );
        return req;
    }
}
