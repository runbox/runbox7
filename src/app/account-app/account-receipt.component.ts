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

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RunboxMe, RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { AsyncSubject } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
    selector: 'app-account-receipt-component',
    templateUrl: './account-receipt.component.html',
    styleUrls: ['./account-receipt.component.scss'],
})
export class AccountReceiptComponent implements OnInit {
    receipt: any;
    me: RunboxMe;
    ready = new AsyncSubject<boolean>();

    statuses = {
        0: 'successful',
        1: 'pending',
    };

    constructor(
        private rmmapi: RunboxWebmailAPI,
        private route:  ActivatedRoute,
    ) {
    }

    async ngOnInit() {
        this.me = await this.rmmapi.me.toPromise();

        const params = await this.route.params.pipe(take(1)).toPromise();
        const receiptID = params.id;

        this.receipt = await this.rmmapi.getReceipt(receiptID).toPromise();

        this.receipt.time = this.receipt.time.replace('T', ' ');
        if (this.receipt.method === 'giro') {
            this.receipt.method = 'offline';
        }

        this.ready.next(true);
        this.ready.complete();
    }
}
