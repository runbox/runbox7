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
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse, HttpClient } from '@angular/common/http';
import { Observable ,  throwError as _throw } from 'rxjs';
import { catchError, filter, tap, map, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ProgressService } from '../http/progress.service';
import { RMMAuthGuardService } from './rmmauthguard.service';

@Injectable()
export class RMMHttpInterceptorService implements HttpInterceptor {

    httpRequestCount = 0;

    constructor(
        private httpClient: HttpClient,
        private router: Router,
        private progressService: ProgressService,
        private authguardservice: RMMAuthGuardService
    ) {

    }

    intercept(
        req: HttpRequest<any>,
        next: HttpHandler
    ): Observable<HttpEvent<any>> {

        if (this.httpRequestCount === 0) {
            this.progressService.httpRequestInProgress.next(true);
        }
        this.httpRequestCount ++;
        // console.log('increment',  req.url, req.method, this.httpRequestCount);
        return next.handle(req).pipe(
            map((evt: HttpEvent<any>) => {
                if (evt instanceof HttpResponse) {
                    const r = evt as HttpResponse<any>;
                    if (r.body && r.body.status === 'error' &&
                        r.body.errors &&
                        r.body.errors[0].indexOf('login') > 0) {
                        this.authguardservice.redirectToLogin();
                        throw(r.body);
                    } else if (r.body.status === 'error') {
                        throw(r.body);
                    }
                }
                return evt;
            }),
            catchError((e) => {
                if (e.status === 403) {
                    console.log('Forbidden');
                    this.httpClient.get('/rest/v1/me')
                        .pipe(
                            filter((r: any) =>
                                r.status === 'error' && r.errors[0].indexOf('login') > 0
                            )
                        )
                        .subscribe((r) => {
                            this.authguardservice.redirectToLogin();
                        });
                }
                return _throw(e);
            }),
            finalize(() => {
                this.httpRequestCount--;
                if (this.httpRequestCount === 0) {
                    this.progressService.httpRequestInProgress.next(false);
                }
                // console.log('decrement', this.httpRequestCount);
            })
        );
    }
}
