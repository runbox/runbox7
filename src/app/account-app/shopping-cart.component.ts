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
import { MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';

import { CartService } from './cart.service';
import { BitpayPaymentDialogComponent } from './bitpay-payment-dialog.component';
import { PaypalPaymentDialogComponent } from './paypal-payment-dialog.component';
import { StripePaymentDialogComponent } from './stripe-payment-dialog.component';
import { PaymentsService } from './payments.service';
import { ProductOrder } from './product-order';

import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { Product } from './product';
import { MobileQueryService } from '../mobile-query.service';

enum CartError {
    CANT_LOAD_PRODUCTS,
    NEED_SUB_FOR_ADDON,
}

class CartItem extends ProductOrder {
    product: Product;
}

@Component({
    selector: 'app-shopping-cart',
    templateUrl: './shopping-cart.component.html',
})
export class ShoppingCartComponent implements OnInit {
    defaultColumns = ['name', 'quantity', 'price', 'total-price', 'remove'];
    mobileColumns = ['name', 'remove'];
    tableColumns: string[];

    // the component has two "modes":
    // it either displays the cart items and allows for their manipulation,
    // or allows for a purchase of whatever is specified in the URL (as JSON),
    // in a non-editable form.
    fromUrl = false;
    domregHash: string;

    orderError: CartError;
    // needed so that templates can refer to enum values through `errors.ERROR_CODE`
    errors = CartError;

    // for things that ended up in the cart, but aren't available for purchase:
    // we'll warn about them and carry on
    missingProducts: number[] = [];

    get missingProductsString(): string {
        return this.missingProducts.map(p => '#' + p).join(', ');
    }

    // it's not as elegant, but it's *so much easier*
    // to handle in the template when it's synchronous
    items: CartItem[] = [];
    // this too is technically fetched asynchronously,
    // but boils down to the currency of the first item
    // in the items above, so for convenience we keep these in sync,
    // synchronously :)
    currency: string;

    total: number;

    itemsSubject = new Subject<CartItem[]>();

    constructor(
        private cart:            CartService,
        private dialog:          MatDialog,
        public  mobileQuery:     MobileQueryService,
        private paymentsservice: PaymentsService,
        private rmmapi:          RunboxWebmailAPI,
        private route:           ActivatedRoute,
        private router:          Router,
    ) {
        this.itemsSubject.subscribe(items => this.calculateTotal(items));
        this.itemsSubject.subscribe(items => this.items = items);
        this.itemsSubject.subscribe(items => this.currency = items.length > 0 ? items[0].product.currency : null);
        this.itemsSubject.subscribe(items => this.checkIfLegal(items));

        this.tableColumns = this.mobileQuery.matches ? this.mobileColumns : this.defaultColumns;
        this.mobileQuery.changed.subscribe(mobile => {
            this.tableColumns = mobile ? this.mobileColumns : this.defaultColumns;
        });
    }

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            const forParam = params['for'];
            if (forParam) {
                const source = JSON.parse(forParam);
                this.fromUrl = true;
                this.tableColumns = ['name', 'quantity', 'price', 'total-price']; // no 'remove'

                if (source['domregHash']) {
                    this.domregHash = source['domregHash'];
                }

                this.loadProducts(source['items']).then(items => {
                    this.itemsSubject.next(items);
                }).catch(e => {
                    this.orderError = CartError.CANT_LOAD_PRODUCTS;
                    throw e;
                });
            } else {
                this.cart.items.subscribe(items => {
                    this.loadProducts(items).then(loadedItems => {
                        this.itemsSubject.next(loadedItems);
                    }).catch(e => {
                        this.orderError = CartError.CANT_LOAD_PRODUCTS;
                        throw e;
                    });
                });
            }
        });
    }

    calculateTotal(items: CartItem[]) {
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
    async loadProducts(items: any[]): Promise<CartItem[]> {
        // this is coming straight from the cart,
        // and we want to enhance a local copy rather than the original
        // maybe there is a more elegant way to do this, but it's concise and works :)
        const cartItems = JSON.parse(JSON.stringify(items));

        let products = await this.paymentsservice.products.toPromise();

        // Check if all the products in the cart had their details in the paymentservice.
        // This may not be true if they're coming from the URL for instance,
        // and in that case we need to fetch them from the API anew.
        // We'll keep these in a Set so that they don't contain duplicate values.
        const neededPidsSet = new Set<number>();
        for (const i of cartItems) {
            const product = products.find(p => p.pid === i.pid);
            if (!product) {
                neededPidsSet.add(i.pid);
            }
        }
        const neededPids = Array.from(neededPidsSet.values());
        if (neededPids.length > 0) {
            const extras = await this.rmmapi.getProducts(neededPids).toPromise();
            if (extras.length !== neededPids.length) {
                console.warn(`Failed to load products ${neededPids.join(',')} (got: ${JSON.stringify(extras)})`);
            }
            products = products.concat(extras);
        }

        this.missingProducts = [];
        for (const i of cartItems) {
            const product = products.find(p => p.pid === i.pid);
            if (!product) {
                this.missingProducts.push(i.pid);
            }
            i.product = product;
        }

        return cartItems.filter((i: CartItem) => !!i.product);
    }

    async checkIfLegal(items: CartItem[]) {
        const me = await this.rmmapi.me.toPromise();

        this.orderError = undefined; // unless we find something else :)

        // cannot buy addon without subscription while on trial
        if (me.is_trial) {
            const bought_addon = items.find(i => i.product.type === 'addon');
            const bought_sub   = items.find(i => i.product.type === 'subscription');

            if (bought_addon && !bought_sub) {
                this.orderError = CartError.NEED_SUB_FOR_ADDON;
            }
        }
    }

    remove(p: ProductOrder) {
        this.cart.remove(p);
    }

    async initiatePayment(method: string) {
        const items = this.items.map(i => {
            return { pid: i.pid, apid: i.apid, quantity: i.quantity };
        });
        const currency = this.items[0].product.currency;
        this.rmmapi.orderProducts(items, method, currency, this.domregHash).subscribe(tx => {
            let dialogRef: MatDialogRef<any>;
            if (method === 'stripe') {
                dialogRef = this.dialog.open(StripePaymentDialogComponent, {
                    data: { tx }
                });
            } else if (method === 'bitpay') {
                dialogRef = this.dialog.open(BitpayPaymentDialogComponent, {
                    data: { tx }
                });
            } else if (method === 'paypal') {
                dialogRef = this.dialog.open(PaypalPaymentDialogComponent, {
                    data: { tx }
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
