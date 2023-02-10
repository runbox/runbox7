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
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';

import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';

@Component({
    selector: 'app-paypal-payment-dialog-component',
    template: `
<div mat-dialog-content style="width: 500px; height: 200px;">
    <span *ngIf="!redirect_url">
        <div> We're preparing your Paypal payment, please wait...</div>
        <mat-spinner style="margin:0 auto;"></mat-spinner>
    </span>
    <span *ngIf="redirect_url">
        Your payment is ready. Click the "Go to Paypal" button below to complete your payment.
    </span>
</div>
<div mat-dialog-actions style="justify-content: space-between;">
    <button mat-button (click)="close()"> Cancel </button>
    <a *ngIf="redirect_url" mat-flat-button color="primary" [href]="redirect_url"> Go to Paypal </a>
</div>
`
})
export class PaypalPaymentDialogComponent {
    tid:    number;
    total:  number;
    currency: string;

    redirect_url: string;

    constructor(
        private rmmapi: RunboxWebmailAPI,
        public dialogRef: MatDialogRef<PaypalPaymentDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.tid = data.tx.tid;
        // not using Router here because we want the entire URL, hostname and all
        const return_url = window.location.href.replace(/account.*/, 'account/paypal/confirm');
        const cancel_url = window.location.href.replace(/account.*/, 'account/paypal/cancel');
        this.rmmapi.payWithPaypal(this.tid, return_url, cancel_url).subscribe(res => {
            this.redirect_url = res.redirect_url;
        });
    }

    close() {
        this.dialogRef.close(false);
    }
}
