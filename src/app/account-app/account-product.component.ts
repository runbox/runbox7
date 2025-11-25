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
import { RunboxMe, RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { CartService } from './cart.service';
import { Product } from './product';
import { ProductOrder } from './product-order';

@Component({
    selector: 'app-account-product',
    templateUrl: './account-product.component.html',
    styleUrls: ['./account-product.component.scss'],
})
export class ProductComponent implements OnInit {
    @Input() p: Product;
    @Input() currency: string;
    @Input() active_sub: boolean;
    @Input() current_sub: Product;
    @Input() me: RunboxMe;

    buy_quantity = 1;
    purchased = false;

    is_current_subscription = false;

    constructor(
        private cart: CartService,
        public  rmmapi:          RunboxWebmailAPI,
    ) {
    }

    ngOnInit() {
        this.cart.items.subscribe(items => {
            this.purchased = !!items.find(i => i.pid === this.p.pid);
        });
        this.is_current_subscription = this.me && this.p.pid === this.me.subscription;
    }

    less() {
        if (this.buy_quantity > 1) {
            this.buy_quantity--;
        }
    }

    more() {
        this.buy_quantity++;
    }

    order() {
        this.cart.add(
            new ProductOrder(this.p.pid, this.p.type, this.buy_quantity)
        );
    }

    unorder() {
        this.cart.remove(
            new ProductOrder(this.p.pid, this.p.type, this.buy_quantity)
        );
    }
}
