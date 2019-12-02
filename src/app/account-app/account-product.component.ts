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
import { ProductOrder } from './product-order';

@Component({
    selector: 'app-account-product',
    templateUrl: './account-product.component.html',
})
export class ProductComponent implements OnInit {
    @Input() p: Product;
    @Input() currency: string;
    @Input() active: boolean;

    quantity = 1;
    purchased = false;

    constructor(
        private cart: CartService,
    ) {
    }

    ngOnInit() {
        this.cart.items.subscribe(items => {
            this.purchased = !!items.find(i => i.pid === this.p.pid);
        });
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
