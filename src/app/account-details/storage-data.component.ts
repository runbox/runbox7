// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2019 Runbox Solutions AS (runbox.com).
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

import { Component } from '@angular/core';
import { AsyncSubject } from 'rxjs';
import { RMM } from '../rmm';

export interface DataUsage {
    type: string;
    quota: number;
    usage: number;
    percentage_used: number;
}

@Component({
    selector: 'app-storage-data-component',
    templateUrl: './storage-data.component.html',
    styleUrls: ['account-details.component.scss'],
})
export class StorageDataComponent {
    dataUsage = new AsyncSubject<DataUsage[]>();
    displayedColumns: string[] = ['type', 'quota', 'usage', 'percentage_used'];

    constructor(public app: RMM) {
    }

    ngOnInit() {
        this.app.account_storage.getUsage().subscribe(dataUsage => {
            const usageArray = [];
            Object.keys(dataUsage.result).forEach(key => usageArray.push({
                type: key,
                details: dataUsage.result[key]
            }));

            const usage = usageArray.map(u => {
                return u;
            });

            usage.reverse();
            this.dataUsage.next(usage);
            this.dataUsage.complete();
        });
    }
}
