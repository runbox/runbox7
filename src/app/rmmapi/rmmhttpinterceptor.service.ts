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
import { Observable,  throwError } from 'rxjs';
import { catchError, map, finalize } from 'rxjs/operators';
import { ProgressService } from '../http/progress.service';
import { RMMAuthGuardService } from './rmmauthguard.service';
import { RMMOfflineService } from './rmmoffline.service';

@Injectable()
export class RMMHttpInterceptorService implements HttpInterceptor {

    httpRequestCount = 0;

    constructor(
        private httpClient: HttpClient,
        private progressService: ProgressService,
        private authguardservice: RMMAuthGuardService,
        private rmmoffline: RMMOfflineService,
    ) {

    }

    checkAccountStatus(): void {
        this.httpClient.get('/rest/v1/me').subscribe((r: any) => {
            console.log('Some query has failed, checking if account is still valid');
            if (r.status === 'error') {
                this.authguardservice.redirectToLogin();
            }
        });
    }

    intercept(
        req: HttpRequest<any>,
        next: HttpHandler
    ): Observable<HttpEvent<any>> {

        if (this.httpRequestCount === 0) {
            this.progressService.httpRequestInProgress.next(true);
        }
        this.httpRequestCount ++;

        return next.handle(req).pipe(
            map((evt: HttpEvent<any>) => {
                if (req.url.startsWith('/rest')) {
                    this.rmmoffline.is_offline = false;
                }
                if (evt instanceof HttpResponse) {
                    const r = evt as HttpResponse<any>;
                    if (r.body && r.body.status === 'error') {
                        if (req.url === '/ajax_mfa_authenticate' && r.body.is_2fa_enabled === '1') {
                            console.log('proceed with 2fa login');
                        } else if (req.url === '/rest/v1/me') {
                            this.authguardservice.redirectToLogin();
                        } else {
                            // TODO we only need to do this if it's our equivalent of a 403,
                            // but we don't have any indicator for that now
                            this.checkAccountStatus();
                        }
                    }
                }
                return evt;
            }),
            catchError((e) => {
                if (e.status === 403) {
                    console.log('Forbidden');
                    this.checkAccountStatus();
                } else if (e.status === 502) {
                    this.rmmoffline.is_offline = true;
                    return throwError(e);
                } else {
                    return throwError(e);
                }
            }),
            finalize(() => {
                this.httpRequestCount--;
                if (this.httpRequestCount === 0) {
                    this.progressService.httpRequestInProgress.next(false);
                }
            })
        );
    }
}
