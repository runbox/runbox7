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
import { MatSnackBar } from '@angular/material/snack-bar';

import { CartService } from './cart.service';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { PaymentsService } from './payments.service';
import { Product } from './product';
import { AsyncSubject } from 'rxjs';

@Component({
    selector: 'app-account-upgrades-component',
    templateUrl: './account-upgrades.component.html',
})
export class AccountUpgradesComponent implements OnInit {
    subscriptions = new AsyncSubject<Product[]>();
    currency: string;

    constructor(
        public  cart:            CartService,
        private paymentsservice: PaymentsService,
        public  rmmapi:          RunboxWebmailAPI,
        private snackbar:        MatSnackBar,
    ) {
    }

    ngOnInit() {
        this.rmmapi.me.subscribe(me => {
            this.currency = me.currency;
        });

        this.paymentsservice.products.subscribe(products => {
            const subs = products.filter(p => p.type === 'subscription');
            this.subscriptions.next(subs);
            this.subscriptions.complete();

            this.cart.items.subscribe(items => {
                const ordered_subs = items.filter(order => subs.find(s => s.pid === order.pid));

                if (ordered_subs.length > 1) {
                    ordered_subs.pop(); // the most recently added one wins
                    for (const o of ordered_subs) {
                        this.cart.remove(o);
                    }
                    this.snackbar.open('You can only buy one main account subscription at a time.', 'Okay');
                }
            });
        });
    }
}
