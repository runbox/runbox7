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

import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';

import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AsyncSubject, Observable, Subject } from 'rxjs';
import { Product } from './product';

@Injectable()
export class PaymentsService {
    errorLog = new Subject<HttpErrorResponse>();

    products       = new AsyncSubject<Product[]>();
    stripePubkey   = new AsyncSubject<string>();
    currency       = new AsyncSubject<string>();

    constructor(
        private rmmapi: RunboxWebmailAPI,
    ) {
        this.rmmapi.getAvailableProducts().subscribe(products => {
            this.products.next(products);
            this.products.complete();
        });
        this.rmmapi.getStripePubkey().subscribe(key => {
            this.stripePubkey.next(key);
            this.stripePubkey.complete();
        });
        this.rmmapi.me.subscribe(me => {
            this.currency.next(me.currency);
            this.currency.complete();
        });
    }

    submitStripePayment(tid: number, token: string): Observable<any> {
        return this.rmmapi.payWithStripe(tid, token);
    }

    confirmStripePayment(paymentId: string): Observable<any> {
        return this.rmmapi.confirmStripePayment(paymentId);
    }

    apiErrorHandler(e: HttpErrorResponse): void {
        this.errorLog.next(e);
    }
}
