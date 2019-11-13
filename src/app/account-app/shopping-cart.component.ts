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
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { AsyncSubject, Subject } from 'rxjs';

import { CartService } from './cart.service';
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
export class ShoppingCartComponent implements OnInit {
    tableColumns = ['name', 'quantity', 'price', 'total-price', 'remove'];

    // the component has two "modes":
    // it either displays the cart items and allows for their manipulation,
    // or allows for a purchase of whatever is specified in the URL (as JSON),
    // in a non-editable form.
    fromUrl = false;
    domregHash: string;

    // it's not as elegant, but it's *so much easier*
    // to handle in the template when it's synchronous
    items = [];
    total: number;

    itemsSubject = new Subject<any[]>();
    currency = new AsyncSubject<string>();

    constructor(
        private cart:            CartService,
        private dialog:          MatDialog,
        private paymentsservice: PaymentsService,
        private rmmapi:          RunboxWebmailAPI,
        private route:           ActivatedRoute,
        private router:          Router,
    ) {
        this.itemsSubject.subscribe(items => this.calculateTotal(items));
        this.itemsSubject.subscribe(items => this.items = items);
        this.currency = this.paymentsservice.currency;
    }

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            const forParam = params['for'];
            if (forParam) {
                const source = JSON.parse(forParam);
                this.fromUrl = true;
                this.tableColumns = ['name', 'quantity', 'price', 'total-price']; // no 'remove'
                if (source['domregHash']) {
                    // this is a domain purchase: the only supported currency is USD
                    this.domregHash = source['domregHash'];
                    this.currency = new AsyncSubject<string>();
                    this.currency.next('USD');
                    this.currency.complete();
                }
                this.loadProducts(source['items']).then(items => this.itemsSubject.next(items));
            } else {
                this.cart.items.subscribe(items => {
                    this.loadProducts(items).then(loadedItems => {
                        this.itemsSubject.next(loadedItems);
                    });
                });
            }
        });
    }

    calculateTotal(items) {
        let total = 0.0;
        for (const i of items) {
            total += i.quantity * i.product.price;
        }
        this.total = total;
    }

    // loads `.product` into incoming items, returns the "enriched" list
    // Example:
    // input: [{ pid: 42 }]
    // output: [{ pid: 42, product: { name: "Runbox mini", price: 9.95, ... }}]
    async loadProducts(items: any[]): Promise<any[]> {
        // this is coming straight from the cart,
        // and we want to enhance a local copy rather than the original
        // maybe there is a more elegant way to do this, but it's concise and works :)
        const cartItems = JSON.parse(JSON.stringify(items));

        let products = await this.paymentsservice.products.toPromise();

        // check if all the products in the cart had their details in the paymentservice
        // this may not be true if they're coming from the URL for instance,
        // and in that case we need to fetch them from the API anew
        const neededPids = [];
        for (const i of cartItems) {
            const product = products.find(p => p.pid === i.pid);
            if (!product) {
                neededPids.push(i.pid);
            }
        }
        if (neededPids.length > 0) {
            const extras = await this.rmmapi.getProducts(neededPids).toPromise();
            products = products.concat(extras);
        }

        for (const i of cartItems) {
            const product = products.find(p => p.pid === i.pid);
            i.product = product || {};
        }

        return cartItems;
    }

    remove(p: ProductOrder) {
        this.cart.remove(p);
    }

    async initiatePayment(method: string) {
        const currency = await this.currency.toPromise();
        const items = this.items.map(i => {
            return { pid: i.pid, apid: i.apid, quantity: i.quantity };
        });
        this.rmmapi.orderProducts(items, method, currency, this.domregHash).subscribe(tx => {
            let dialogRef: MatDialogRef<any>;
            if (method === 'stripe') {
                dialogRef = this.dialog.open(StripePaymentDialogComponent, {
                    data: { tx: tx, currency: currency, method: method }
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
                    this.cart.clear();
                }
                return;
            }

            dialogRef.afterClosed().subscribe(paid => {
                if (paid && !this.fromUrl) {
                    this.cart.clear();
                }
            });
        });
    }
}
