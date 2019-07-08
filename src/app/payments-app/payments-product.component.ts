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
import { FormControl } from '@angular/forms';
import { Product } from './product';

@Component({
    selector: 'app-payments-product',
    template: `
<mat-card>
    <mat-card-title>
        <mat-radio-button *ngIf="p.type === 'subscription'" [value]="p.id">
            {{ p.name }}
            <!-- specialcase for the "no subscription" option -->
            <span *ngIf="p.price"> – {{ p.price }} {{ currency }} </span>
        </mat-radio-button>
        <span *ngIf="p.type === 'addon'">
            {{ p.name }} – {{ p.price }} {{ currency }}
        </span>
    </mat-card-title>
    <mat-card-subtitle>
        {{ p.description }}
    </mat-card-subtitle>
    <mat-card-content *ngIf="p.type === 'subscription'">
        <ng-content></ng-content>
    </mat-card-content>
    <mat-card-content *ngIf="p.type === 'addon'">
        Amount:
        <input matInput type="number" min="0" [formControl]="fc">
        <span *ngIf="fc.value > 0">
            Total: {{ fc.value * p.price | number:'1.2-2' }} {{ currency }}
        </span>
    </mat-card-content>
</mat-card>
    `,
})
export class ProductComponent {
    @Input() p: Product;
    @Input() currency: string;
    @Input() fc: FormControl;
}
