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
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, CanActivateChild } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';

@Injectable()
export class RMMAuthGuardService implements CanActivate, CanActivateChild {

    urlBeforeLogin = '';
    wasLoggedIn = false;

    constructor(
        public http: HttpClient,
        public router: Router
    ) {

    }

    isLoggedIn(): Observable<boolean> {
        return this.http.get('/rest/v1/me').pipe(
            map((res: any) => {
                this.wasLoggedIn = res && res.status === 'success';
                return this.wasLoggedIn;
            }),
        );
    }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | Observable<boolean> | Promise<boolean> {
        this.urlBeforeLogin = state.url;

        // Asynchronously check in whether the user is logged in or not
        const loginCheck = new Promise<boolean>((resolve, _reject) => {
            this.isLoggedIn().pipe(take(1)).subscribe(
                success => {
                    if (!success) {
                        this.redirectToLogin();
                    }
                    resolve(success);
                },
                _error => {
                    resolve(false);
                }
            );
        });

        // We don't want the success of the navigation to depend on the async check above every time,
        // as that would add precious time to every route switch, causing noticable and annoying delays.
        //
        // So if we saw user being logged in before, we assume that they still are:
        // the async login check will still continue in the background
        // and kick the user out in case we were wrong.
        if (this.wasLoggedIn) {
            return true;
        }

        // If the user was not logged in last time we checked,
        // then we actually block the navigation until we're sure.
        return loginCheck;
    }

    canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | Observable<boolean> | Promise<boolean> {
        return this.canActivate(childRoute, state);
    }

    redirectToLogin() {
        if (this.urlBeforeLogin === 'login') {
            this.urlBeforeLogin = '/';
        }
        console.log('Will navigate back to ', this.urlBeforeLogin);
        this.router.navigate(['login']);
    }
}
