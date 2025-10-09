// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2025 Runbox Solutions AS (runbox.com).
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
import { map } from 'rxjs/operators';
import { BehaviorSubject, Observable } from 'rxjs';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';

export interface DomainKey {
    selector: string;
    created: string;
    is_active: boolean;
    is_cname_correct: boolean;
}

export class Domain {
    name: string;
    status: number;
    is_rotating: boolean;
    keys: DomainKey[];

    public static fromObject(obj: any): Domain {
        const ret = Object.assign(new Domain(), obj);
        return ret;
    }
}

@Injectable({ providedIn: 'root' })
export class DomainService {
    public userDomains: BehaviorSubject<any[]> = new BehaviorSubject([]);

    constructor(
        public rmmapi: RunboxWebmailAPI
    ) {
        this.refresh();
    }

    refresh() {
        // fetch all user (virtual+hosted) domains, regardless of dkim status:
        this.rmmapi.getUserDomains().subscribe(
            (res: Domain[]) => {
                this.userDomains.next(res);
            }
        );
    }

    check_cname(domain: string, key: DomainKey): Observable<boolean> {
        return this.rmmapi.checkDomainCName(domain, key.selector).pipe(
            map((res: boolean) => {
                this.refresh();
                return res;
            }));
    }
}
