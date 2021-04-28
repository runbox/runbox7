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

import { RunboxMe, RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { PaymentsService } from './payments.service';
import { Product } from './product';
import { AsyncSubject } from 'rxjs';

@Component({
    selector: 'app-account-addons-component',
    templateUrl: './account-addons.component.html',
})
export class AccountAddonsComponent implements OnInit {
    me: RunboxMe = new RunboxMe();

    subaccounts    = new AsyncSubject<Product[]>();
    emailaddons    = new AsyncSubject<Product[]>();

    constructor(
        private paymentsservice: PaymentsService,
        private rmmapi:          RunboxWebmailAPI,
    ) {
    }

    ngOnInit() {
        this.paymentsservice.products.subscribe(products => {
            this.subaccounts.next(products.filter(p => p.subtype === 'subaccount'));
            this.emailaddons.next(products.filter(p => p.subtype === 'emailaddon'));

            this.subaccounts.complete();
            this.emailaddons.complete();
        });

        this.rmmapi.me.subscribe(me => this.me = me);
    }
}
