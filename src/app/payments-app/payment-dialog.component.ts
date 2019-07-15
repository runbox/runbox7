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

import { AfterViewInit, Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

import { PaymentsService } from './payments.service';
import { ScriptLoaderService } from './scriptloader.service';

declare var Stripe: any;

@Component({
    selector: 'app-payments-payment-dialog-component',
    templateUrl: 'payment-dialog.component.html',
})
export class PaymentDialogComponent implements AfterViewInit {
    method: string;
    tid:    number;
    total:  number;
    currency: string;

    paymentRequestsSupported = false;
    processing = false;
    
    stripe: any;
    card: any;

    stripeError: string;
    zipCode: string;

    @ViewChild('paymentRequestButton') paymentRequestButton: ElementRef;
    @ViewChild('cardNumber') 		   cardNumber:  		 ElementRef;
    @ViewChild('cardExpiry') 		   cardExpiry:  		 ElementRef;
    @ViewChild('cardCvc')    		   cardCvc:     		 ElementRef;

    constructor(
        private dialog: MatDialog,
        private paymentsservice: PaymentsService,
        private scriptLoader: ScriptLoaderService,
        public dialogRef: MatDialogRef<PaymentDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.method = data.method;
        this.tid    = data.tx.tid;
        this.total  = data.tx.total;
        this.currency = data.currency;
	}

	async ngAfterViewInit() {
        console.log("I'm AfterViewInit");
        await this.scriptLoader.loadScript('stripe') 
        console.log("stripe loaded");

        this.paymentsservice.stripePubkey.subscribe(stripePubkey => {
            const stripeStyle = {
                base: {
                    fontSize: '18px',
                    color: "#32325d",
                    textAlign: 'center',
                }
            };

            this.stripe = Stripe(stripePubkey);
            const elements = this.stripe.elements();

            const paymentRequest = this.stripe.paymentRequest({
                country: 'NO',
                currency: this.currency.toLowerCase(),
                total: {
                    label: 'angular payment',
                    amount: this.total * 100,
                },
            });

            const prButton = elements.create('paymentRequestButton', {
                paymentRequest: paymentRequest,
            });
            paymentRequest.canMakePayment().then(result => {
                if (result) {
                    prButton.mount(this.paymentRequestButton.nativeElement);
                    this.paymentRequestsSupported = true;
                }
            });

            this.card = elements.create('cardNumber', {style: stripeStyle});
            this.card.mount(this.cardNumber.nativeElement);
            this.card.addEventListener('change', e => this.errorHandler(e));

            const expiry = elements.create('cardExpiry', {style: stripeStyle});
            expiry.mount(this.cardExpiry.nativeElement);
            expiry.addEventListener('change', e => this.errorHandler(e));

            var cvc = elements.create('cardCvc', {style: stripeStyle});
            cvc.mount(this.cardCvc.nativeElement);
            cvc.addEventListener('change', e => this.errorHandler(e));
        });
    }

    errorHandler(event: any) {
		if (event.error) {
			this.stripeError = event.error.message;
		} else {
			this.stripeError = '';
		}
    }

    submitPayment() {
        console.log("Paying...");
        this.processing = true;

        const additionals = { billing_details: { address: { postal_code: this.zipCode } } };

        this.stripe.createPaymentMethod('card', this.card, additionals).then(result => {
            if (result.error) {
                this.stripeError = result.error.message;
                this.processing = false;
            } else {
                console.log(result);
                this.paymentsservice.submitStripePayment(this.tid, result.paymentMethod.id).subscribe(res => {
                    console.log("Got payment result:", res);
                });
            }
        });
    }
}
