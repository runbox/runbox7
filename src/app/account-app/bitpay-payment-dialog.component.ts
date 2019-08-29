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

import { Component, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { HttpErrorResponse } from '@angular/common/http';

import { CartService } from './cart.service';
import { PaymentsService } from './payments.service';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';

@Component({
    selector: 'app-bitpay-payment-dialog-component',
    template: `
<div mat-dialog-content style="width: 500px; height: 200px;">
    <span *ngIf="!redirect_url">
        We're preparing your Bitpay payment, please wait...
        <mat-spinner style="margin:0 auto;"></mat-spinner>
    </span>
    <span *ngIf="redirect_url">
        Your payment is ready. Click the "Go to Bitpay" button below to complete your payment.
    </span>
</div>
<div mat-dialog-actions style="justify-content: space-between;">
    <button mat-button (click)="close()"> Cancel </button>
    <button *ngIf="redirect_url" mat-flat-button color="primary" (click)="redirect()"> Go to Bitpay </button>
</div>
`
})
export class BitpayPaymentDialogComponent {
    tid:    number;
    total:  number;
    currency: string;

    redirect_url: string;

    constructor(
        private cart: CartService,
        private dialog: MatDialog,
        private rmmapi: RunboxWebmailAPI,
        private paymentsservice: PaymentsService,
        private router: Router,
        public dialogRef: MatDialogRef<BitpayPaymentDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.tid = data.tx.tid;
        // not using Router here because we want the entire URL, hostname and all
        const receipt_url = window.location.href.replace(/account.*/, 'account/receipt/' + this.tid);
        this.rmmapi.payWithBitpay(this.tid, receipt_url).subscribe(res => {
            this.redirect_url = res.redirect_url;
        });
    }

    redirect() {
        // the payment is not through yet, but this is the last call to clear the cart
        // (we won't get notified on the frontend of its confirmation)
        this.cart.clear();
        window.location.href = this.redirect_url;
    }

    close() {
        this.dialogRef.close(false);
    }
}
