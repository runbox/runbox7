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

import { Component, OnInit, ViewChild } from '@angular/core';
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

@Component({
    selector: 'app-account-upgrades-component',
    templateUrl: './account-upgrades.component.html',
    styleUrls: ['./account-upgrades.component.scss'],
})
export class AccountUpgradesComponent implements OnInit {
    @ViewChild(RunboxTimerComponent) runboxtimer: RunboxTimerComponent;
    me: RunboxMe = new RunboxMe();

    subaccounts    = new AsyncSubject<Product[]>();
    emailaddons    = new AsyncSubject<Product[]>();
    subscriptions  = new AsyncSubject<Product[]>();
    subs_regular   = new AsyncSubject<Product[]>();
    subs_special   = new AsyncSubject<Product[]>();
    current_sub;

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
            // User's current subscription product:
            this.current_sub = products.find(p => p.pid == this.me.subscription);

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
        });

        this.rmmapi.me.subscribe(me => {
            this.me = me;
            this.limitedTimeOffer = !me.newerThan(this.limited_time_offer_age);
        });
    }

    runboxTimerFinished(): void {
        this.limitedTimeOffer = false;
    }
}
