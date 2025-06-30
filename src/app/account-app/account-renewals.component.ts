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

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';

import { CartService } from './cart.service';
import { MobileQueryService } from '../mobile-query.service';
import { ProductOrder } from './product-order';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { SubAccountRenewalDialogComponent } from './sub-account-renewal-dialog';
import { DataUsageInterface } from '../rmm/account-storage';
import { AsyncSubject } from 'rxjs';
import { RMM } from '../rmm';

import moment from 'moment';

const columnsDefault = ['renewal_name', 'quantity', 'price', 'active_from', 'active_until', 'hints', 'recur', 'renew'];
const columnsMobile = ['renewal_name'];

// TODO define it as an interface
type ActiveProduct = any;

@Component({
    selector: 'app-account-renewals-component',
    templateUrl: './account-renewals.component.html',
})
export class AccountRenewalsComponent {
    active_products: ActiveProduct[] = [];
    all_products: ActiveProduct[] = [];
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
    ) {
        this.rmmapi.me.subscribe(me => {
            this.current_subscription = me.subscription;
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
            
            this.cart.items.subscribe(_ => {
                for (const p of this.active_products) {
                    this.cart.contains(p.pid, p.apid).then(ordered => p.ordered = ordered);
                }
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

    renew(p: ActiveProduct) {
        if (p.subtype !== 'domain') {
            this.cart.add(new ProductOrder(p.pid, p.quantity, p.apid));
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
        {{ p.active ? 'Yes' : 'No' }}
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
export class AccountRenewalsRenewNowButtonComponent {
    @Input() p: ActiveProduct;
    @Input() usage: DataUsageInterface;
    @Output() clicked: EventEmitter<void> = new EventEmitter();

    close_to_quota = [];
    close_percentage = 90;
    
    ngOnInit() {
        this.close_to_quota = this.check_close_quota();
    }

  // OverQuota for displayed product, if any of the (space) limits have been hit
    check_close_quota() {
        let oq = [];
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
