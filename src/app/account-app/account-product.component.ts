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

import { Component, Input } from '@angular/core';
import { PaymentsService } from './payments.service';
import { Product } from './product';
import { ProductOrder } from './product-order';

@Component({
    selector: 'app-account-product',
    template: `
<mat-card>
    <mat-card-title>
        {{ p.name }}
    </mat-card-title>
    <mat-card-subtitle>
        {{ p.description }}
    </mat-card-subtitle>
    <mat-card-content>
        <ng-content></ng-content>
    </mat-card-content>
    <mat-card-actions style="display: flex; justify-content: center;" *ngIf="p.type === 'subscription'">
        <button mat-button (click)="order()">
            Upgrade for {{ p.price }} {{ currency }}
        </button>
    </mat-card-actions>
    <mat-card-actions style="display: flex; justify-content: center; align-content: baseline;" *ngIf="p.type === 'addon'">
        <button mat-icon-button (click)="less()">
            <mat-icon> remove_circle_outline </mat-icon>
        </button>
        <button mat-button>
            {{ quantity }}
        </button>
        <button mat-icon-button (click)="more()">
            <mat-icon> add_circle_outline </mat-icon>
        </button>
        <button mat-button (click)="order()">
            Purchase for {{ quantity * p.price | number:'1.2-2' }} {{ currency }}
        </button>
    </mat-card-actions>
</mat-card>
    `,
})
export class ProductComponent {
    @Input() p: Product;
    @Input() currency: string;

    quantity = 1;

    constructor(
        private paymentsservice: PaymentsService,
    ) {
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
        this.paymentsservice.cart.add(
            new ProductOrder(this.p.pid, this.quantity)
        );
    }
}
