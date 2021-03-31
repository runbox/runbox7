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

export interface DataUsage {
    type: string;
    quota: number;
    usage: number;
    percentage_used: number;
}

const USAGE_DATA: DataUsage[] = [
    { type: 'Mail storage', quota: 0, usage: 0, percentage_used: 0 },
    { type: 'Files storage', quota: 0, usage: 0, percentage_used: 0 },
    { type: 'Sent email', quota: 0, usage: 0, percentage_used: 0 },
    { type: 'Received email', quota: 0, usage: 0, percentage_used: 0 },
    { type: 'Bandwidth usage', quota: 0, usage: 0, percentage_used: 0 },
];

@Component({
    selector: 'app-storage-data-component',
    templateUrl: './storage-data.component.html',
    styleUrls: ['account-details.component.scss'],
})
export class StorageDataComponent {
    displayedColumns: string[] = ['type', 'quota', 'usage', 'percentage_used'];
    dataSource = USAGE_DATA;

    constructor() {}
}
