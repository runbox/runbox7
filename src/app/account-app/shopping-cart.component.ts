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

import { Component } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material';
import { ActivatedRoute, Router } from '@angular/router';

import { Cart } from './cart';
import { BitpayPaymentDialogComponent } from './bitpay-payment-dialog.component';
import { PaypalPaymentDialogComponent } from './paypal-payment-dialog.component';
import { StripePaymentDialogComponent } from './stripe-payment-dialog.component';
import { PaymentsService } from './payments.service';
import { ProductOrder } from './product-order';

import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';

@Component({
    selector: 'app-shopping-cart',
    templateUrl: './shopping-cart.component.html',
})
export class ShoppingCartComponent {
    products     = {}; // pid => Product
    itemsReady   = false;
    total        = 0.0;
    tableColumns = ['name', 'quantity', 'price', 'total-price', 'remove'];

    currency: string;
    domregHash: string;

    // the component has two "modes":
    // it either displays the cart items and allows for their manipulation,
    // or allows for a purchase of whatever is specified in the URL (as JSON),
    // in a non-editable form.
    fromUrl = false;
    items = [];

    constructor(
        private dialog:          MatDialog,
        public  paymentsservice: PaymentsService,
        private rmmapi:          RunboxWebmailAPI,
        private route:           ActivatedRoute,
        private router:          Router,
    ) {
        this.route.queryParams.subscribe(params => {
            const forParam = params['for'];
            if (forParam) {
                const source = JSON.parse(forParam);
                this.fromUrl = true;
                this.tableColumns = ['name', 'quantity', 'price', 'total-price']; // no 'remove'
                this.items   = source['items'];
                if (source['domregHash']) {
                    // this is a domain purchase: the only supported currency is USD
                    this.domregHash = source['domregHash'];
                    this.currency = 'USD';
                    this.loadProducts(this.items, this.currency);
                } else {
                    this.paymentsservice.currency.subscribe(c => {
                        this.currency = c;
                        this.loadProducts(this.items, this.currency);
                    });
                }
            } else {
                this.items = this.paymentsservice.cart.items;
                this.paymentsservice.currency.subscribe(c => {
                    this.currency = c;
                    this.loadProducts(this.items, this.currency);
                });
            }
        });
    }

    calculateTotal() {
        this.total = 0.0;
        for (const i of this.items) {
            this.total += i.quantity * this.products[i.pid].price;
        }
    }

    loadProducts(items: any[], currency: string) {
        this.rmmapi.getProducts(this.items.map(i => i.pid), this.currency).subscribe(products => {
            for (const p of products) {
                this.products[p.pid] = p;
            }
            this.calculateTotal();
            this.itemsReady = true;
        });
    }

    remove(p: ProductOrder) {
        this.paymentsservice.cart.remove(p);
        this.items = this.paymentsservice.cart.items;
        this.calculateTotal();
    }

    initiatePayment(method: string) {
        this.rmmapi.orderProducts(this.items, method, this.currency, this.domregHash).subscribe(tx => {
            let dialogRef: MatDialogRef<any>;
            if (method === 'stripe') {
                dialogRef = this.dialog.open(StripePaymentDialogComponent, {
                    data: { tx: tx, currency: this.currency, method: method }
                });
            } else if (method === 'bitpay') {
                dialogRef = this.dialog.open(BitpayPaymentDialogComponent, {
                    data: { tx: tx }
                });
            } else if (method === 'paypal') {
                dialogRef = this.dialog.open(PaypalPaymentDialogComponent, {
                    data: { tx: tx }
                });
            } else if (method === 'giro') {
                this.router.navigateByUrl('/account/receipt/' + tx.tid);
                if (!this.fromUrl) {
                    this.paymentsservice.cart.clear();
                }
                return;
            }

            dialogRef.afterClosed().subscribe(paid => {
                if (paid && !this.fromUrl) {
                    this.paymentsservice.cart.clear();
                }
            });
        });
    }
}
