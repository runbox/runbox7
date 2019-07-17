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

import {
    Component,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    ViewChild,
    TemplateRef
} from '@angular/core';

import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

import { ActivatedRoute } from '@angular/router';

import { Http, ResponseContentType } from '@angular/http';
import { HttpErrorResponse } from '@angular/common/http';

import {
    MatDialog,
    MatSnackBar
} from '@angular/material';

import { Subject } from 'rxjs';

import { RunboxMe, RunboxWebmailAPI } from '../rmmapi/rbwebmail';

import { PaymentDialogComponent } from './payment-dialog.component';
import { PaymentsService } from './payments.service';
import { Product } from './product';

@Component({
    selector: 'app-account-upgrades-component',
    templateUrl: './account-upgrades.component.html',
})
export class AccountUpgradesComponent {
    me: RunboxMe = new RunboxMe();
    products: Product[];

    subscriptions: Product[];
    subaccounts:   Product[];
    emailaddons:   Product[];
    hostingaddons: Product[]

    selection: FormGroup = new FormGroup({
        subscription: this.fb.control('')
    });

    selected_products = [];

    constructor(
        public  paymentsservice: PaymentsService,
        private dialog:   MatDialog,
        private fb:       FormBuilder,
        private rmmapi:   RunboxWebmailAPI,
        private snackBar: MatSnackBar,
    ) {
        this.paymentsservice.products.subscribe(products => {
            this.products = products;

            this.subscriptions = this.products.filter(p => p.type === 'subscription');
            this.subaccounts   = this.products.filter(p => p.subtype === 'subaccount');
            this.emailaddons   = this.products.filter(p => p.subtype === 'emailaddon');
            this.hostingaddons = this.products.filter(p => p.subtype === 'hosting');
            this.selection     = this.createForm()
        });

        this.rmmapi.me.subscribe(me => this.me = me);
    }

    createForm(): FormGroup {
        const form = this.fb.group({
            subscription: this.fb.control('', Validators.required),
        });

        for (const p of this.products.filter(p => p.type === 'addon')) {
            form.addControl(p.id, this.fb.control(0, Validators.min(0)));
        }

        form.valueChanges.subscribe(() => {
            this.selected_products = [];

            const subid = form.get('subscription').value;
            if (subid && subid != 'NONE') {
                const product = this.products.find(p => p.id === subid);
                this.selected_products.push({
                    pid:      product.pid,
                    name:     product.name,
                    quantity: 1,
                    price:    product.price,
                });
            }

            for (const product of this.products.filter(p => p.type === 'addon')) {
                const quantity = form.get(product.id).value;
                if (quantity > 0) {
                    this.selected_products.push({
                        pid:      product.pid,
                        name:     product.name,
                        quantity: quantity,
                        price:    product.price,
                    });
                }
            }
        });
        return form;
    }
}
