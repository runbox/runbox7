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

                if (paymentsservice.cart.contains(p.pid, p.apid)) {
                    p.ordered = true;
                }

                return p;
            });
        });
    }

    renew(p: any) {
        this.paymentsservice.cart.add(
            new ProductOrder(p.pid, p.quantity, p.apid)
        );
        p.ordered = true;
    }
}
