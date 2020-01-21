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
import { ProductOrder } from './product-order';
import { AsyncSubject } from 'rxjs';

@Component({
    selector: 'app-account-upgrades-component',
    templateUrl: './account-upgrades.component.html',
})
export class AccountUpgradesComponent implements OnInit {
    subscriptions = new AsyncSubject<Product[]>();
    trial_with_own_domain = false;
    ordered_micro         = false;
    ordered_email_hosting = false;
    currency: string;

    MICRO_PID = 1001;
    EMAIL_HOSTING_PID = 57;
    email_hosting_product: Product;

    constructor(
        private cart:            CartService,
        private paymentsservice: PaymentsService,
        public rmmapi:           RunboxWebmailAPI,
        private snackbar:        MatSnackBar,
    ) {
    }

    ngOnInit() {
        this.rmmapi.me.subscribe(me => {
            this.trial_with_own_domain = me.is_trial && me.uses_own_domain;
            this.currency = me.currency;
        });

        this.paymentsservice.products.subscribe(products => {
            this.email_hosting_product = products.find(p => p.pid === this.EMAIL_HOSTING_PID);

            const subs = products.filter(p => p.type === 'subscription');
            this.subscriptions.next(subs);
            this.subscriptions.complete();

            this.cart.items.subscribe(items => {
                this.ordered_email_hosting = !!items.find(o => o.pid === this.EMAIL_HOSTING_PID);

                const ordered_subs = items.filter(order => subs.find(s => s.pid === order.pid));
                this.ordered_micro = !!ordered_subs.find(o => o.pid === this.MICRO_PID);

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

    order_email_hostng(): void {
        this.cart.add(new ProductOrder(this.EMAIL_HOSTING_PID, 1));
    }
}
