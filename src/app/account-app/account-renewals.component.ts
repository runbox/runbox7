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

import { CartService } from './cart.service';
import { PaymentsService } from './payments.service';
import { ProductOrder } from './product-order';

import * as moment from 'moment';

@Component({
    selector: 'app-account-renewals-component',
    templateUrl: './account-renewals.component.html',
})
export class AccountRenewalsComponent {
    active_products = [];

    constructor(
        private cart:            CartService,
        private paymentsservice: PaymentsService,
    ) {
        this.paymentsservice.activeProducts.subscribe(products => {
            this.active_products = products.map(p => {
                p.active_until = moment(p.active_until, moment.ISO_8601);
                const day_diff = p.active_until.diff(moment(), 'days');
                if (day_diff < 0) {
                    p.expired = true;
                } else if (day_diff < 90) {
                    p.expires_soon = true;
                }

                // TODO subscribe to cart to recheck these whenever they change
                cart.contains(p.pid, p.apid).then(ordered => p.ordered = ordered);

                return p;
            });
        });
    }

    renew(p: any) {
        this.cart.add(new ProductOrder(p.pid, p.quantity, p.apid));
        // TODO follow-up: if we subscribe above then we don't have to flag it here
        p.ordered = true;
    }
}
