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

import { Component, Input, OnInit } from '@angular/core';
import { CartService } from './cart.service';
import { Product } from './product';
import { DataUsageInterface } from '../rmm/account-storage';
import { ProductOrder } from './product-order';

@Component({
    selector: 'app-account-product',
    templateUrl: './account-product.component.html',
})
export class ProductComponent implements OnInit {
    @Input() p: Product;
    @Input() currency: string;
    @Input() active_sub: boolean;
    @Input() usage: DataUsageInterface;

    allow_multiple = false;
    quantity = 1;
    purchased = false;

    over_quota = [];
    addon_usages = [];

    constructor(
        private cart: CartService,
    ) {
    }

    ngOnInit() {
        this.cart.items.subscribe(items => {
            this.purchased = !!items.find(i => i.pid === this.p.pid);
        });
        this.allow_multiple = this.p.type === 'addon';
        this.over_quota = this.check_over_quota();
        this.addon_usages = this.get_addon_usages();
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

    // Displays amount used up of currently owned quota
    get_addon_usages() {
        let pu = [];
        if (this.p && this.usage && this.p.type === 'addon') {
            Object.keys(this.p.quotas).map((key) => {
                // addon items
                if (this.p.quotas[key] && this.usage[key]) {
                    pu.push({'quota': this.usage[key].quota, 'current': this.usage[key].usage, 'type': this.usage[key].type });
                }
            });
        }
        return pu;
        
    }

    less() {
        if (this.quantity > 1) {
            this.quantity--;
        }
    }

    more() {
        this.quantity++;
    }

    order() {
        this.cart.add(
            new ProductOrder(this.p.pid, this.quantity)
        );
    }

    unorder() {
        this.cart.remove(
            new ProductOrder(this.p.pid, this.quantity)
        );
    }
}
