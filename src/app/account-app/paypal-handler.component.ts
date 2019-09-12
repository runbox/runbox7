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
import { ActivatedRoute, Router } from '@angular/router';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { CartService } from './cart.service';
import { PaymentsService } from './payments.service';

@Component({
    selector: 'app-paypal-handler',
    template: `
<div>
    <h4 style="text-align: center;"> Your payment is being finalized... </h4>
    <mat-spinner style="margin:0 auto;"></mat-spinner>
</div>
`
})
export class PaypalHandlerComponent {
    constructor(
        private cart: CartService,
        private paymentsservice: PaymentsService,
        private rmmapi: RunboxWebmailAPI,
        private route:  ActivatedRoute,
        private router: Router,
    ) {
        // TODO: this assumes /paypal/confirm. We should handle /paypal/cancel too
        this.route.queryParams.subscribe(params => {
            // yes, the capitalization of params is inconsistent
            // there's not typo: it's just Paypal :)
            const payment_id = params['paymentId'];
            const payer_id   = params['PayerID'];
            this.rmmapi.confirmPaypalPayment(payment_id, payer_id).subscribe(res => {
                console.log(res);
                this.cart.clear();
                this.router.navigateByUrl('/account/receipt/' + res.tid);
            });
        });
    }
}
