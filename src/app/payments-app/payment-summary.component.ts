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
import { PaymentDialogComponent } from './payment-dialog.component';
import { PaymentsService } from './payments.service';
import { MatDialog } from '@angular/material';

@Component({
    selector: 'app-payment-summary',
    templateUrl: './payment-summary.component.html',
})
export class PaymentSummaryComponent {
    @Input() products: any[] = [];
    total: number;

    currency: string;

    constructor(
        public  paymentsservice: PaymentsService,
        private dialog:          MatDialog,
    ) {
        this.paymentsservice.currency.subscribe(c => this.currency = c);
    }

    ngOnInit() {
        this.total = 0;
        for (const p of this.products) {
            this.total += p.price * p.quantity;
        }
    }

    initiatePayment(method: string) {
        const order = this.products.map(p => {
            return { pid: p.pid, quantity: p.quantity, apid: p.apid };
        });
        this.paymentsservice.orderProducts(order, method, this.currency).subscribe(tx => {
            console.log("Transaction:", tx);
            this.dialog.open(PaymentDialogComponent, {
				data: { tx: tx, currency: this.currency, method: method }
			});
        });
    }
}
