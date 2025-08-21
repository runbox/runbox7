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
import { HttpClient } from '@angular/common/http';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { RunboxWebmailAPI } from './rbwebmail';

@Injectable()
export class RMMAuthGuardService  {

    urlBeforeLogin = '';
    wasLoggedIn = false;
    loginPromise;
    currentMe;
    
    constructor(
        public http: HttpClient,
        public router: Router,
        private rmmapi : RunboxWebmailAPI,
    ) {
    }

    checkLogin(): Promise<boolean | UrlTree> {
        if (!this.loginPromise) {
            this.loginPromise = new Promise<boolean | UrlTree>((resolve, _reject) => {
                this.isLoggedIn().pipe(take(1)).subscribe(
                    success => {
                        this.loginPromise = null;
                        if (!success) {
                            resolve(this.router.parseUrl('/login'));
                        } else {
                            resolve(success);
                        }
                    },
                    error => {
                        this.loginPromise = null;
                        if (error.status === 403) {
                            resolve(false);
                        } else {
                            // No indication that the user is unauthorized.
                            // Let them in, and have the httpinterceptor figure out what to do.
                            resolve(true);
                        }
                    }
                );
            });
        }
        return this.loginPromise;
    }

    isLoggedIn(): Observable<boolean | UrlTree> {
        return this.http.get('/rest/v1/me').pipe(
            map((res: any) => {
                if (res && res.status === 'success') {
                    this.wasLoggedIn = true;
                    const me = res.result;
                    // ugly? we could subscribe to it..
                    this.currentMe = me;
                    this.rmmapi.setRunboxMe(me);
                } else {
                    this.wasLoggedIn = false;
                }
                return this.checkStatus();
            }),
        );
    }

    checkStatus(): boolean | UrlTree {
        // Expired users are only allowed to visit account/subscriptions
        if (this.currentMe && this.urlBeforeLogin
            && this.currentMe.account_status === 'expired'
          && !this.urlBeforeLogin.startsWith('/account')) {
            console.log('Before login ' + this.urlBeforeLogin);
            return this.router.parseUrl('/account/subscriptions');
        } else {
            return this.wasLoggedIn;
        }
        
    }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
        this.urlBeforeLogin = state.url;

        // Asynchronously check in whether the user is logged in or not
        const loginCheck = this.checkLogin();

        // We don't want the success of the navigation to depend on the async check above every time,
        // as that would add precious time to every route switch, causing noticable and annoying delays.
        //
        // So if we saw user being logged in before, we assume that they still are:
        // the async login check will still continue in the background
        // and kick the user out in case we were wrong.
        
        if (this.wasLoggedIn) {
            return this.checkStatus();
        }

        // If the user was not logged in last time we checked,
        // then we actually block the navigation until we're sure.
        return loginCheck;
    }

    canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
        return this.canActivate(childRoute, state);
    }

    redirectToLogin() {
        if (this.urlBeforeLogin === 'login') {
            this.urlBeforeLogin = '/';
        }
        console.log('Will navigate back to ', this.urlBeforeLogin);
        if(this.wasLoggedIn) {
            this.router.navigate(['login']);
        }
    }
}
