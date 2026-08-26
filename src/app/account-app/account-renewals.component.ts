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

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';

import { CartService } from './cart.service';
import { MobileQueryService } from '../mobile-query.service';
import { PaymentsService } from './payments.service';
import { Product } from './product';
import { ProductOrder } from './product-order';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { SubAccountRenewalDialogComponent } from './sub-account-renewal-dialog';
import { DataUsageInterface } from '../rmm/account-storage';
import { AsyncSubject } from 'rxjs';
import { RMM } from '../rmm';

import { Decimal } from 'decimal.js-light';
import moment from 'moment';

const columnsDefault = ['renewal_name', 'quantity', 'price', 'active_from', 'active_until', 'hints', 'recur', 'renew'];
const columnsMobile = ['renewal_name'];

// TODO define it as an interface
type ActiveProduct = any;

function getSubaccountDiskQuota(product: ActiveProduct | Product): number | undefined {
    return product?.sub_product_quota?.Disk?.quota;
}

function getProductPrice(product: ActiveProduct | Product): Decimal | undefined {
    if (product?.price === undefined || product.price === null) {
        return undefined;
    }
    return new Decimal(product.price);
}

export function findThreeYearSubaccountProduct(activeProduct: ActiveProduct, products: Product[]): Product | undefined {
    if (activeProduct?.subtype !== 'subaccount') {
        return undefined;
    }

    const currentProduct = products.find(product => product.pid === activeProduct.pid) || activeProduct;
    const activeDiskQuota = getSubaccountDiskQuota(currentProduct);
    const activePrice = getProductPrice(currentProduct);
    if (activeDiskQuota === undefined || activePrice === undefined) {
        return undefined;
    }

    const minimumThreeYearPrice = activePrice.times(2);
    const maximumThreeYearPrice = activePrice.times(3.1);

    return products
        .filter(product => product.subtype === 'subaccount')
        .filter(product => product.type === activeProduct.type)
        .filter(product => product.pid !== activeProduct.pid)
        .filter(product => getSubaccountDiskQuota(product) === activeDiskQuota)
        .filter(product => {
            const productPrice = getProductPrice(product);
            return productPrice
                && productPrice.greaterThanOrEqualTo(minimumThreeYearPrice)
                && productPrice.lessThanOrEqualTo(maximumThreeYearPrice);
        })
        .sort((a, b) => {
            const priceA = getProductPrice(a);
            const priceB = getProductPrice(b);
            if (priceA === undefined || priceB === undefined) {
                return 0;
            }
            return priceB.comparedTo(priceA);
        })[0];
}

@Component({
    selector: 'app-account-renewals-component',
    templateUrl: './account-renewals.component.html',
})
export class AccountRenewalsComponent {
    active_products: ActiveProduct[] = [];
    all_products: ActiveProduct[] = [];
    available_products: Product[] = [];
    current_subscription: number;

    loadedProducts = false;

    displayedColumns: string[];
    expandedProduct: ActiveProduct;
    showExpired = false;

    quota_usage    = new AsyncSubject<DataUsageInterface>();

    constructor(
        public  mobileQuery: MobileQueryService,
        private cart: CartService,
        private dialog: MatDialog,
        private rmmapi: RunboxWebmailAPI,
        private router: Router,
        private snackbar: MatSnackBar,
        private rmm: RMM,
        private paymentsservice: PaymentsService,
    ) {
        this.rmmapi.me.subscribe(me => {
            this.current_subscription = me.subscription;
        });

        this.paymentsservice.products.subscribe(products => {
            this.available_products = products;
            this.updateThreeYearRenewalProducts();
        });

        // User's current usage:
        this.rmm.account_storage.getUsage().subscribe(usage => {
            this.quota_usage.next(usage.result);
            this.quota_usage.complete();
        });
        this.rmmapi.getActiveProducts().subscribe(products => {
            this.all_products = products.map(p => {
                p.active_from = moment(p.active_from, moment.ISO_8601);
                p.active_until = moment(p.active_until, moment.ISO_8601);
                const day_diff = p.active_until.diff(moment(), 'days');
                if (day_diff < 0) {
                    p.expired = true;
                } else if (day_diff < 90) {
                    p.expires_soon = true;
                }
                if (day_diff < 365 * -2) {
                    p.expired_over_2_years = true;
                }

                // no renewals for trials; domains handled separately
                p.can_renew = (p.pid !== 1000) && (p.subtype !== 'domain');

                return p;
            });

            this.sortAndFilterProducts();
            this.updateThreeYearRenewalProducts();
            
            this.cart.items.subscribe(_ => {
                this.updateOrderedStates();
            });
            this.loadedProducts = true;
        });

        this.displayedColumns = this.mobileQuery.matches ? columnsMobile : columnsDefault;
        this.mobileQuery.changed.subscribe(mobile => {
            this.displayedColumns = mobile ? columnsMobile : columnsDefault;
            if (!mobile) {
                this.expandedProduct = null;
            }
        });
    }

    renew(p: ActiveProduct, renewalProduct?: Product) {
        if (p.subtype !== 'domain') {
            const product = renewalProduct || p;
            this.cart.add(new ProductOrder(product.pid, product.type, p.quantity, p.apid));
        } else {
            this.renewDomain(p);
        }
    }

    renewDomain(p: ActiveProduct) {
        this.rmmapi.getProductDomain(p.apid).subscribe(
            domain => {
                this.router.navigateByUrl('/domainregistration?renew_domain=' + domain);
            },
            _err => {
                this.snackbar.open('Failed to determine domain for the product. Try again later or contact Runbox Support', 'Okay');
            },
        );
    }

    showSubsDialog(p: ActiveProduct) {
        const dialogRef = this.dialog.open(SubAccountRenewalDialogComponent, { data: p });
        dialogRef.afterClosed().subscribe(renew => {
            if (renew) {
                this.renew(p);
            }
        });
    }

    showHideExpiredProducts() {
        this.showExpired = !this.showExpired;
        this.sortAndFilterProducts();
    }

    sortAndFilterProducts() {
        if (!this.showExpired) {
            this.active_products = this.all_products.filter((p) => !p.expired_over_2_years);
        } else {
            this.active_products = this.all_products;
        }

        this.active_products.sort((p_a, p_b) => {
            if (p_a.expired != p_b.expired) {
                if (p_a.active_until > p_b.active_until) {
                    return -1;
                } else if (p_a.active_until < p_b.active_until) {
                    return 1;
                }
            } else {
                return 0;
            }
        });
    }

    updateThreeYearRenewalProducts() {
        for (const p of this.all_products) {
            p.three_year_renewal_product = findThreeYearSubaccountProduct(p, this.available_products);
        }
        this.updateOrderedStates();
    }

    updateOrderedStates() {
        for (const p of this.active_products) {
            const containsDefaultRenewal = this.cart.contains(p.pid, p.apid);
            const containsThreeYearRenewal = p.three_year_renewal_product
                ? this.cart.contains(p.three_year_renewal_product.pid, p.apid)
                : Promise.resolve(false);
            Promise.all([containsDefaultRenewal, containsThreeYearRenewal]).then(
                ([defaultRenewalOrdered, threeYearRenewalOrdered]) => p.ordered = defaultRenewalOrdered || threeYearRenewalOrdered,
            );
        }
    }

    toggleAutorenew(p: ActiveProduct) {
        p.changingAutorenew = new Promise((resolve, reject) => {
            this.rmmapi.setProductAutorenew(p.apid, !p.active).subscribe(
                _ => {
                    p.active = !p.active;
                    p.changingAutorenew = undefined;
                    resolve(null);
                },
                _err => {
                    this.snackbar.open('Failed to adjust autorenewal settings. Try again later or contact Runbox Support', 'Okay');
                    p.changingAutorenew = undefined;
                    reject();
                }
            );
        });
    }
}

@Component({
    selector: 'app-account-renewals-autorenew-toggle-component',
    template: `
<span *ngIf="p.can_renew; else renewNA">
    <mat-checkbox *ngIf="!p.changingAutorenew"
        [checked]="p.active"
        (change)="toggle.emit()">
    </mat-checkbox>
    <app-runbox-loading *ngIf="p.changingAutorenew"
        size="tiny"
        text="{{ p.active ? 'Disabling' : 'Enabling' }}"
    >
    </app-runbox-loading>
</span>
<ng-template #renewNA>
    N/A
</ng-template>
    `,
})
export class AccountRenewalsAutorenewToggleComponent {
    @Input() p: ActiveProduct;
    @Output() toggle: EventEmitter<void> = new EventEmitter();
}

@Component({
    selector: 'app-account-renewals-renew-now-button-component',
    template: `
<div *ngIf="!p.expired && close_to_quota.length > 0">
Warning: You are close to your quotas for this product
</div>
<span *ngIf="p.can_renew; else renewIfDomain">
    <button mat-raised-button (click)="clicked.emit()" *ngIf="!p.ordered" color="primary" id="renewButton">
        Renew  <mat-icon svgIcon="cart" color="accent"></mat-icon>
    </button>
    <button mat-raised-button (click)="clicked.emit(threeYearProduct)" *ngIf="!p.ordered && threeYearProduct" color="accent" id="renewThreeYearButton">
        Renew for 3 years <mat-icon svgIcon="cart"></mat-icon>
    </button>
    <span *ngIf="p.ordered">
        Added to shopping cart
    </span>
</span>
<ng-template #renewIfDomain>
    <button mat-raised-button *ngIf="p.subtype === 'domain'; else renewNA" color="primary" (click)="clicked.emit()" id="renewButton">
        Renew <mat-icon svgIcon="open-in-new"></mat-icon>
    </button>
</ng-template>
<ng-template #renewNA>
    N/A
</ng-template>
    `,
})
export class AccountRenewalsRenewNowButtonComponent implements OnInit {
    @Input() p: ActiveProduct;
    @Input() usage: DataUsageInterface;
    @Input() threeYearProduct?: Product;
    @Output() clicked: EventEmitter<Product | undefined> = new EventEmitter();

    close_to_quota = [];
    close_percentage = 90;
    
    ngOnInit() {
        this.close_to_quota = this.check_close_quota();
    }

  // OverQuota for displayed product, if any of the (space) limits have been hit
    check_close_quota() {
        const oq = [];
        if (this.p && this.usage) {
            Object.keys(this.p.quotas).map((key) => {
              if ( !key.endsWith('Subaccount')
                && this.usage[key]
                && this.usage[key].type === 'bytes'
                && this.usage[key].percentage_used >= this.close_percentage) {
                    oq.push({'quota': key, 'allowed': this.p.quotas[key].quota, 'current': this.usage[key].usage, 'type': this.usage[key].type, 'percentage': this.usage[key].percentage_used });
                }
            });
        }
        return oq;
    }
}
