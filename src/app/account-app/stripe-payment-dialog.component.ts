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
import { Router } from '@angular/router';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { HttpErrorResponse } from '@angular/common/http';

import { PaymentsService } from './payments.service';
import { AsyncSubject } from 'rxjs';

let stripeLoader: AsyncSubject<void> = null;
declare var Stripe: any;

@Component({
    selector: 'app-stripe-payments-payment-dialog-component',
    templateUrl: 'stripe-payment-dialog.component.html',
})
export class StripePaymentDialogComponent implements AfterViewInit {
    method: string;
    tid:    number;
    total:  number;
    currency: string;

    paymentRequestsSupported = false;
    state = 'loading';

    stripe: any;
    card: any;

    stripeError: string;
    zipCode: string;
    failure: string;

    @ViewChild('paymentRequestButton') paymentRequestButton: ElementRef;
    @ViewChild('cardNumber') cardNumber:           ElementRef;
    @ViewChild('cardExpiry') cardExpiry:           ElementRef;
    @ViewChild('cardCvc') cardCvc:              ElementRef;

    constructor(
        private paymentsservice: PaymentsService,
        private router: Router,
        public dialogRef: MatDialogRef<StripePaymentDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        console.log('Opening stripe form for transaction', data.tx);
        this.tid    = data.tx.tid;
        this.total  = data.tx.total;
        this.currency = data.tx.currency;

        if (stripeLoader === null) {
            stripeLoader = new AsyncSubject<void>();
            console.log('Loading Stripe.js');
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = 'https://js.stripe.com/v3/';
            script.onload = () => stripeLoader.complete();
            document.getElementsByTagName('head')[0].appendChild(script);
        }
    }

    async ngAfterViewInit() {
        await stripeLoader.toPromise();
        const stripePubkey = await this.paymentsservice.stripePubkey.toPromise();

        const stripeStyle = {
            base: {
                fontSize: '18px',
                color: '#32325d',
                textAlign: 'center',
            }
        };

        this.stripe = Stripe(stripePubkey);
        const elements = this.stripe.elements();

        const paymentRequest = this.stripe.paymentRequest({
            country: 'NO',
            currency: this.currency.toLowerCase(),
            total: {
                label: 'Runbox purchase #' + this.tid,
                amount: Math.trunc(this.total * 100),
            },
        });

        const prButton = elements.create('paymentRequestButton', {
            paymentRequest: paymentRequest,
        });
        paymentRequest.canMakePayment().then(result => {
            if (result) {
                prButton.mount(this.paymentRequestButton.nativeElement);
                this.paymentRequestsSupported = true;
                paymentRequest.on('paymentmethod', (ev: any) => {
                    this.handlePaymentMethod(ev.paymentMethod).then(
                        () => ev.complete('success'),
                        () => ev.complete('fail'),
                    );
                });
            }
        });

        this.card = elements.create('cardNumber', {style: stripeStyle});
        this.card.mount(this.cardNumber.nativeElement);
        this.card.addEventListener('change', e => this.errorHandler(e));

        const expiry = elements.create('cardExpiry', {style: stripeStyle});
        expiry.mount(this.cardExpiry.nativeElement);
        expiry.addEventListener('change', e => this.errorHandler(e));

        const cvc = elements.create('cardCvc', {style: stripeStyle});
        cvc.mount(this.cardCvc.nativeElement);
        cvc.addEventListener('change', e => this.errorHandler(e));

        this.state = 'initial';
    }

    errorHandler(event: any) {
        if (event.error) {
            this.stripeError = event.error.message;
        } else {
            this.stripeError = '';
        }
    }

    submitPayment() {
        this.state = 'processing';

        const additionals = { billing_details: { address: { postal_code: this.zipCode } } };

        this.stripe.createPaymentMethod('card', this.card, additionals).then(result => {
            if (result.error) {
                this.stripeError = result.error.message;
                this.state = 'initial';
            } else {
                console.log(result);
                this.handlePaymentMethod(result.paymentMethod);
            }
        });
    }

    handlePaymentMethod(paymentMethod: any) {
        return new Promise<void>((resolve, reject) => {
            this.paymentsservice.submitStripePayment(this.tid, paymentMethod.id).subscribe(res => {
                if (res.status === 'requires_source_action') {
                    const client_secret = res.client_secret;
                    this.stripe.handleCardAction(client_secret).then(actionRes => {
                        if (actionRes.error) {
                            this.state = 'failure';
                            this.stripeError = actionRes.error.message;
                            reject();
                        } else {
                            console.log(actionRes.paymentIntent);
                            this.confirmPayment(actionRes.paymentIntent.id).then(resolve, reject);
                        }
                    });
                } else if (res.status === 'succeeded') {
                    this.state = 'finished';
                    resolve();
                } else if (res.error.message) {
                    this.fail(res.error.message);
                } else {
                    this.fail(undefined);
                    reject();
                }
            }, error => {
                this.fail(error);
                reject();
            });
        });
    }

    confirmPayment(paymentIntentId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.paymentsservice.confirmStripePayment(paymentIntentId).subscribe(
                pi => {
                    if (pi.status === 'succeeded') {
                        this.state = 'finished';
                        resolve();
                    } else if (pi.error) {
                        this.fail(pi.error.message);
                        reject();
                    } else {
                        this.unhandled_status(pi.status);
                        reject();
                    }
                }, error => {
                    this.fail(error);
                    reject();
                }
            );
        });
    }

    fail(error: any) {
        this.state = 'failure';

        if (!error) {
            this.stripeError = `Payment did not succeed. Please try a different payment method or contact Runbox Support`;
        } else if (typeof error === 'string') {
            this.stripeError = error;
        } else if (error instanceof HttpErrorResponse) {
            this.stripeError = `Runbox could not process your payment (status: ${error.status}). `
                             + 'Please try a different payment method or contact Runbox Support';
        } else {
            if (error.status === 'error') {
                // backend error
                this.stripeError = error.result.error.message;
            }
        }
    }

    unhandled_status(status: string) {
        if (status) {
            this.fail(`Payment did not succeed (status: ${status}). Please try a different payment method or contact Runbox Support`);
        } else {
            this.fail(undefined);
        }
    }

    showReceipt() {
        this.router.navigateByUrl('/account/receipt/' + this.tid);
        this.close();
    }

    close() {
        this.dialogRef.close(this.state === 'finished');
    }
}
