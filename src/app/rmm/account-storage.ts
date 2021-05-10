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

export interface StorageUsedInterface {
    quota: number;
    usage: number;
    percentage_used: number;
}

export interface DataUsageInterface {
    mail_storage: StorageUsedInterface;
    files_storage: StorageUsedInterface;
    sent_email: StorageUsedInterface;
    received_email: StorageUsedInterface;
    bandwidth_usage: StorageUsedInterface;
}

export interface StorageDetailsInterface {
    location: string;
    home_dir: string;
    backup_interval: string;
}

export class AccountStorage {
    data: DataUsageInterface;
    details: StorageDetailsInterface;
    is_busy = false;

    constructor(public app: RMM) {}

    getUsage(): Observable<any> {
        this.is_busy = true;
        const req = this.app.http.get('/rest/v1/account/usage', {}).pipe(timeout(60000), share());
        req.subscribe(
            (reply) => {
                this.is_busy = false;
                if (reply['status'] === 'success') {
                    this.data = reply['result'];
                } else if (reply['status'] === 'error') {
                    this.app.show_error(reply['error'].join(''), 'Dismiss');
                    return;
                }
            },
            (error) => {
                this.is_busy = false;
                return this.app.show_error('Could not load data usage', 'Dismiss');
            }
        );
        return req;
    }

    getDetails(): Observable<any> {
        this.is_busy = true;
        const req = this.app.http.get('/rest/v1/account/storage', {}).pipe(timeout(60000), share());
        req.subscribe(
            (reply) => {
                this.is_busy = false;
                if (reply['status'] === 'success') {
                    this.details = reply['result'];
                } else if (reply['status'] === 'error') {
                    this.app.show_error(reply['error'].join(''), 'Dismiss');
                    return;
                }
            },
            (error) => {
                this.is_busy = false;
                return this.app.show_error('Could not load storage details', 'Dismiss');
            }
        );
        return req;
    }
}
