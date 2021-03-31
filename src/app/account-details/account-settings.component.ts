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

export interface AccountSettings {
    description: string;
    status: boolean;
}

const SETTINGS_DATA: AccountSettings[] = [
    { description: 'Send news about offers from Runbox:', status: false },
    { description: 'Send bandwidth summary when you are close to reaching the limit:', status: false },
    { description: 'Automatically delete messages from Trash after 30 days (recommended):', status: true },
    { description: 'Automatically delete messages from Spam folder after 30 days (recommended):', status: true },
];

@Component({
    selector: 'app-account-settings-component',
    templateUrl: './account-settings.component.html',
    styleUrls: ['account-details.component.scss'],
})
export class AccountSettingsComponent {
    displayedColumns: string[] = ['description', 'status'];
    dataSource = SETTINGS_DATA;

    constructor() {}
}
