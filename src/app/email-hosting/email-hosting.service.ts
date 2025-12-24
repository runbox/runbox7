// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2024 Runbox Solutions AS (runbox.com).
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
import { Observable, BehaviorSubject } from 'rxjs';
import { map, timeout, share } from 'rxjs/operators';
import { Domain, DomainQuota, DomainApiResponse, DomainQuotaApiResponse } from './domain';

@Injectable({ providedIn: 'root' })
export class EmailHostingService {
    private domainsSubject = new BehaviorSubject<Domain[]>([]);
    private quotaSubject = new BehaviorSubject<DomainQuota | null>(null);

    public domains$ = this.domainsSubject.asObservable();
    public quota$ = this.quotaSubject.asObservable();

    constructor(private http: HttpClient) {}

    loadDomains(): Observable<Domain[]> {
        const req = this.http.get<DomainApiResponse>('/rest/v1/account/domain').pipe(
            timeout(60000),
            share()
        );
        req.subscribe({
            next: (response) => {
                if (response.status === 'success' && Array.isArray(response.result)) {
                    this.domainsSubject.next(response.result);
                }
            },
            error: (err) => {
                console.error('Failed to load domains', err);
            }
        });
        return req.pipe(
            map(response => response.status === 'success' ? response.result as Domain[] : [])
        );
    }

    loadQuota(): Observable<DomainQuota | null> {
        const req = this.http.get<DomainQuotaApiResponse>('/rest/v1/email_hosting/domains_quota').pipe(
            timeout(60000),
            share()
        );
        req.subscribe({
            next: (response) => {
                if (response.status === 'success' && response.result) {
                    this.quotaSubject.next(response.result);
                }
            },
            error: (err) => {
                console.error('Failed to load domain quota', err);
            }
        });
        return req.pipe(
            map(response => response.status === 'success' ? response.result ?? null : null)
        );
    }

    getDomain(name: string): Observable<Domain | null> {
        return this.http.get<DomainApiResponse>(`/rest/v1/account/domain/${encodeURIComponent(name)}`).pipe(
            timeout(60000),
            map(response => response.status === 'success' ? response.result as Domain : null)
        );
    }

    addDomain(domain: string, catchAll: boolean): Observable<DomainApiResponse> {
        const req = this.http.post<DomainApiResponse>('/rest/v1/account/domain', {
            domain,
            catch_all: catchAll
        }).pipe(
            timeout(60000),
            share()
        );
        req.subscribe({
            next: (response) => {
                if (response.status === 'success') {
                    this.loadDomains();
                    this.loadQuota();
                }
            }
        });
        return req;
    }

    updateDomain(name: string, catchAll: boolean): Observable<DomainApiResponse> {
        const req = this.http.put<DomainApiResponse>(`/rest/v1/account/domain/${encodeURIComponent(name)}`, {
            catch_all: catchAll
        }).pipe(
            timeout(60000),
            share()
        );
        req.subscribe({
            next: (response) => {
                if (response.status === 'success') {
                    this.loadDomains();
                }
            }
        });
        return req;
    }

    deleteDomain(name: string): Observable<DomainApiResponse> {
        const req = this.http.delete<DomainApiResponse>(`/rest/v1/account/domain/${encodeURIComponent(name)}`).pipe(
            timeout(60000),
            share()
        );
        req.subscribe({
            next: (response) => {
                if (response.status === 'success') {
                    this.loadDomains();
                    this.loadQuota();
                }
            }
        });
        return req;
    }
}
