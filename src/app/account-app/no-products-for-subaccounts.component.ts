// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2021 Runbox Solutions AS (runbox.com).
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
import { RunboxMe, RunboxWebmailAPI } from '../rmmapi/rbwebmail';

@Component({
    selector: 'app-account-not-for-subaccounts',
    template: `
<div>
    <h4>
        <p>
            This is a sub-account and can't be managed from within the sub-account itself.
        </p>
        <p>
            Please have the owner of the administrator account
            <span *ngIf="owner">({{ owner }})</span>
            do that for you.
        </p>
    </h4>
</div>
`
})
export class NoProductsForSubaccountsComponent {
    owner: string;

    constructor(rmmapi: RunboxWebmailAPI) {
        rmmapi.me.subscribe((me: RunboxMe) => {
            this.owner = me.owner?.username;
        });
    }
}
