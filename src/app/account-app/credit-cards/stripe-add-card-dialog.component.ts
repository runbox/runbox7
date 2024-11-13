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
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';

import { PaymentsService } from '../payments.service';
import { firstValueFrom, AsyncSubject } from 'rxjs';

let stripeLoader: AsyncSubject<void> = null;
declare let Stripe: any;

@Component({
    selector: 'app-stripe-add-card-dialog',
    templateUrl: 'stripe-add-card-dialog.component.html',
})
export class StripeAddCardDialogComponent implements AfterViewInit {
    state = 'loading';
    clientSecret: string;

    stripe: any;
    elements: any;
    payment: any;
    card: any;

    stripeError: string;
    zipCode: string;
    failure: string;

    @ViewChild('paymentElement') paymentElement:      ElementRef;

    constructor(
        private paymentsservice: PaymentsService,
        public dialogRef: MatDialogRef<StripeAddCardDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.clientSecret = data.clientSecret;

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
        const customerSession = await firstValueFrom(this.paymentsservice.customerSession());

        this.stripe = Stripe(stripePubkey);
        const options = {
            clientSecret: this.clientSecret,
            appearance: {
                rules: {
                    '.CheckboxInput': {
                        border: '1px solid #32325d'
                    }
                },
                variables: { colorPrimaryText: '#32325d'},
            }
        };
        if (Object.keys(customerSession).includes('customer_session_client_secret')) {
            options['customerSessionClientSecret'] = customerSession['customer_session_client_secret'];
        }
        this.elements = this.stripe.elements(options);

        this.payment = this.elements.create('payment', {
            layout: { 'type': 'accordion',
                      'defaultCollapsed': false,
                      'radios': true
                    }
        });
        this.payment.mount(this.paymentElement.nativeElement);

        this.state = 'initial';
    }

    errorHandler(event: any) {
        if (event.error) {
            this.stripeError = event.error.message;
        } else {
            this.stripeError = '';
        }
    }

    submitCardDetails() {
        this.state = 'processing';

        this.stripe.confirmSetup(
            {
                elements: this.elements,
                redirect: 'if_required',
                // confirmParams: {
                //     return_url: '',
                // }
            }
        ).then((result: any) => {
            console.log(result);
            if (result.setupIntent.status === 'succeeded') {
                this.stripeError = '';
                this.state = 'finished';
            } else {
                this.state = 'initial';
                this.stripeError = result?.error?.message;
            }
        });
    }

    close() {
        this.dialogRef.close(this.state === 'finished');
    }
}
