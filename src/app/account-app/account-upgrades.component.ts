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

import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';

import { CartService } from './cart.service';
import { RunboxMe, RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { PaymentsService } from './payments.service';
import { Product } from './product';
import { RMM } from '../rmm';
import { DataUsageInterface } from '../rmm/account-storage';
import { RunboxTimerComponent } from './runbox-timer';
import { AsyncSubject } from 'rxjs';
import { RunboxSidenavService } from '../runbox-components/runbox-sidenav.service';
import { ProductOrder } from './product-order';

@Component({
    selector: 'app-account-upgrades-component',
    templateUrl: './account-upgrades.component.html',
    styleUrls: ['./account-upgrades.component.scss'],
})
export class AccountUpgradesComponent implements OnInit {
    @Input() p: Product;
    @Input() currency: string;
    @Input() active_sub: boolean;
    @Input() usage: DataUsageInterface;
    @Input() current_sub: Product;
    @Input() me: RunboxMe;

    allow_multiple = false;
    quantity = 1;
    purchased = false;

    over_quota = [];
    addon_usages = [];
    is_upgrade = false;
    is_downgrade = false;
    is_current_subscription: boolean = false;

    @ViewChild(RunboxTimerComponent) runboxtimer: RunboxTimerComponent;

    subaccounts    = new AsyncSubject<Product[]>();
    emailaddons    = new AsyncSubject<Product[]>();
    subscriptions  = new AsyncSubject<Product[]>();
    subs_regular   = new AsyncSubject<Product[]>();
    subs_special   = new AsyncSubject<Product[]>();

    quota_usage    = new AsyncSubject<DataUsageInterface>(); 

    limitedTimeOffer = false;
    limited_time_offer_age = 24 * 60 * 60 * 1000; // 24hours in microseconds

    constructor(
        public  cart:            CartService,
        private paymentsservice: PaymentsService,
        public  rmmapi:          RunboxWebmailAPI,
        private snackbar:        MatSnackBar,
        private rmm:             RMM,
        public sidenavService:   RunboxSidenavService,
    ) {
    }

    ngOnInit() {
        // User's current usage:
        this.rmm.account_storage.getUsage().subscribe(usage => {
            this.quota_usage.next(usage.result);
            this.quota_usage.complete();
        });

        this.paymentsservice.products.subscribe(products => {
            const subs_all = products.filter(p => p.type === 'subscription');
            this.subscriptions.next(subs_all);
            this.subscriptions.complete();

            const subs_regular = products.filter(p => p.type === 'subscription' && p.subtype !== 'special');
            this.subs_regular.next(subs_regular);
            this.subs_regular.complete();

            const subs_special = products.filter(p => p.type === 'subscription' && p.subtype === 'special');
            this.subs_special.next(subs_special);
            this.subs_special.complete();

            const subaccounts = products.filter(p => p.subtype === 'subaccount');
            subaccounts.sort((a,b) => a.sub_product_quota.Disk.quota - b.sub_product_quota.Disk.quota);
            this.subaccounts.next(subaccounts);
            this.emailaddons.next(products.filter(p => p.subtype === 'emailaddon'));

            this.subaccounts.complete();
            this.emailaddons.complete();

            this.cart.items.subscribe(items => {
                const ordered_subs = items.filter(order => subs_all.find(s => s.pid === order.pid));

                if (ordered_subs.length > 1) {
                    ordered_subs.pop(); // the most recently added one wins
                    for (const o of ordered_subs) {
                        this.cart.remove(o);
                    }
                    this.snackbar.open('You can only buy one main account subscription at a time.', 'OK');
                }
            });

            this.rmmapi.me.subscribe(me => {
                this.me = me;
                // User's current subscription product:
                if (this.subscriptions) {
                    this.current_sub = products.find(p => p.pid === this.me.subscription);
                }
                this.limitedTimeOffer = !me.newerThan(this.limited_time_offer_age);
            });
        });
    this.over_quota = this.check_over_quota();
    }


    // OverQuota for displayed product, if any of the limits have been hit
    // Returns list of reasons why can't buy this product:
    // Eg You have 2 virtual domains, this product only allows 1
    check_over_quota() {
        let oq = [];
        if (this.p && this.usage) {
            Object.keys(this.p.quotas).map((key) => {
                // Subscriptions / main accounts
                if (this.usage[key] && this.p.quotas[key].type === 'fixed' && this.p.quotas[key].quota < this.usage[key].usage) {
                    oq.push({'quota': this.usage[key].name, 'allowed': this.p.quotas[key].quota, 'current': this.usage[key].usage, 'type': this.usage[key].type });
                }
            });
        }
        return oq;
    }

    runboxTimerFinished(): void {
        this.limitedTimeOffer = false;
    }

    // Displays amount used up of currently owned quota
    get_addon_usages(p) {
        let pu = [];
        if (p && this.usage && p.type === 'addon') {
            Object.keys(p.quotas).map((key) => {
                // addon items
                if (p.quotas[key] && this.usage[key]) {
                    pu.push({'quota': this.usage[key].quota, 'current': this.usage[key].usage, 'type': this.usage[key].type });
                }
            });
        }
        return pu;
    }


    orderMainProduct(newProduct: number) {
        this.cart.add(
            new ProductOrder(newProduct, this.quantity)
        );
    }

    order(p) {
        console.log(p);
        this.cart.add(
            new ProductOrder(p.pid, this.quantity)
        );
    }

    unorder(p) {
        this.cart.remove(
            new ProductOrder(p.pid, this.quantity)
        );
    }
}
