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
import { Router, NavigationEnd } from '@angular/router';
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
    @Input() currency: string;
    @Input() active_sub: boolean;
    @Input() usage: DataUsageInterface;
    @Input() current_sub: Product;
    @Input() me: RunboxMe;

    quantity = 1;

    @ViewChild(RunboxTimerComponent) runboxtimer: RunboxTimerComponent;

    subaccounts      = new AsyncSubject<Product[]>();
    emailaddons      = new AsyncSubject<Product[]>();
    subscriptions    = new AsyncSubject<Product[]>();
    subs_regular     = new AsyncSubject<Product[]>();
    subs_three       = new AsyncSubject<Product[]>();
    subs_special     = new AsyncSubject<Product[]>();
    three_year_plans = new AsyncSubject<Product[]>();
    orig_three_plans = new AsyncSubject<Product[]>();

    quota_usage    = new AsyncSubject<DataUsageInterface>();

    cart_items_subject = new AsyncSubject<Map<number, boolean>>();
    cart_items = new Map();

    limitedTimeOffer = false;
    limited_time_offer_age = 24 * 60 * 60 * 1000; // 24hours in microseconds

    constructor(
        public  cart:            CartService,
        private paymentsservice: PaymentsService,
        public  rmmapi:          RunboxWebmailAPI,
        private snackbar:        MatSnackBar,
        private rmm:             RMM,
        public sidenavService:   RunboxSidenavService,
        private router:          Router,
    ) {
      this.router.events.subscribe(e => {
        if (e instanceof NavigationEnd) {
          const tree = router.parseUrl(router.url);
          if (tree.fragment) {
            const element = document.querySelector('#' + tree.fragment);
            if (element) { element.scrollIntoView(true); }
          }
        }
      });
    }

    ngOnInit() {
        this.paymentsservice.products.subscribe(products => {
            products.map(p => this.cart_items.set(p.pid, false));
            this.cart_items_subject.next(this.cart_items);
            this.cart_items_subject.complete();
            const subs_all = products.filter(p => p.type === 'subscription');
            this.subscriptions.next(subs_all);
            this.subscriptions.complete();

            const subs_regular = products.filter(p => p.type === 'subscription' && p.subtype !== 'special' && p.pid >= 1000 && p.pid <= 1010);
            this.subs_regular.next(subs_regular);
            this.subs_regular.complete();

            const subs_three = products.filter(p => p.type === 'subscription' && p.subtype !== 'special' && p.pid >= 10000 && p.pid <= 20000);
            this.subs_three.next(subs_three);
            this.subs_three.complete();

            // comparison columns:
            const three_year_subtypes = ['mini3', 'medium3', 'max3'];
            const three_year = products.sort((a,b) => a.pid - b.pid).filter(p => three_year_subtypes.includes(p.subtype));
            this.three_year_plans.next(three_year);
            this.three_year_plans.complete();

            const orig_subtypes = ['mini', 'medium', 'maxi'];
            const orig_plans = products.sort((a,b) => a.pid - b.pid).filter(p => orig_subtypes.includes(p.subtype));
            this.orig_three_plans.next(orig_plans);
            this.orig_three_plans.complete();

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
                items.map(i => this.cart_items.set(i.pid, true));
                this.cart_items_subject.next(this.cart_items);
                this.cart_items_subject.complete();
                const ordered_subs = items.filter(order => subs_all.find(s => s.pid === order.pid));

                if (ordered_subs.length > 1) {
                    ordered_subs.pop(); // the most recently added one wins
                    for (const o of ordered_subs) {
                        this.cart.remove(o);
                    }
                    this.snackbar.open('You can only buy one main account subscription at a time.', 'OK');
                }
            });

            // User's current usage:
            this.rmm.account_storage.getUsage().subscribe(usage => {
                this.quota_usage.next(usage.result);
                this.quota_usage.complete();

                // replace three_year_plans with a set that has an over_quota
                // value
                this.three_year_plans = new AsyncSubject<Product[]>();
                this.check_over_quota(three_year, usage.result);
                this.three_year_plans.next(three_year);
                this.three_year_plans.complete();
                this.check_over_quota(subs_regular, usage.result);
                this.subs_regular.next(subs_regular);
                this.subs_regular.complete();
            });

            this.rmmapi.me.subscribe(me => {
                this.me = me;
                // User's current subscription product:
                this.rmmapi.getProducts([this.me.subscription]).subscribe(res => {
                    this.current_sub = res[0];

                    // replace subs_regular with a set that has the is_upgrade
                    // is_downgrade values
                    this.subs_regular = new AsyncSubject<Product[]>();
                    this.merge_subs_with_usage(subs_regular);
                    this.subs_regular.next(subs_regular);
                    this.subs_regular.complete();
                });
                this.limitedTimeOffer = !me.newerThan(this.limited_time_offer_age);
            });
        });
    }


    // OverQuota for displayed product, if any of the limits have been hit
    // Returns list of reasons why can't buy this product:
    // Eg You have 2 virtual domains, this product only allows 1
    check_over_quota(plans, usage) {
        if (plans && usage) {
            for(const p of plans) {
                const oq = [];
                Object.keys(p.quotas).map((key) => {
                    if (usage[key] && p.quotas[key].type === 'fixed' && p.quotas[key].quota < usage[key].usage) {
                        oq.push({'quota': usage[key].name, 'allowed': p.quotas[key].quota, 'current': usage[key].usage, 'type': usage[key].type });
                    }
                });
                p.over_quota = oq;
            }
        }
    }

    runboxTimerFinished(): void {
        this.limitedTimeOffer = false;
    }

    // Set upgrade/downgrade flags on regular plans using current_sub quotas
    merge_subs_with_usage(subs_reg) {
        if(!this.current_sub || !subs_reg) {
            return;
        }
        // subs_reg is output as a table, add is_upgrade/is_downgrade booleans
        for (const plan of subs_reg) {
            if (this.me.is_trial) {
                plan.is_upgrade = true;
                plan.is_downgrade = false;
                continue;
            }
            if (plan.quotas.Disk.quota < this.current_sub.quotas.Disk.quota) {
                plan.is_downgrade = true;
            } else if (plan.quotas.Disk.quota > this.current_sub.quotas.Disk.quota) {
                plan.is_upgrade = true;
            }
        }
    }

    orderMainProduct(newProduct: number, type: string, quantity: number) {
        this.cart.add(
            new ProductOrder(newProduct, type, quantity)
        );
    }

    order(p: Product) {
        console.log(p);
        this.cart.add(
            new ProductOrder(p.pid, p.type, this.quantity)
        );
    }

    unorder(p: Product) {
        this.cart_items.set(p.pid, false);
        this.cart_items_subject.next(this.cart_items);
        this.cart_items_subject.complete();
        this.cart.remove(
            new ProductOrder(p.pid, p.type, this.quantity)
        );
    }
}
