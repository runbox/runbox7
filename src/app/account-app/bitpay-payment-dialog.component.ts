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

import { CartService } from './cart.service';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';

export interface PaymentOption {
    id:           string;
    displayName:  string;
    address:      string;
    amount:       number;
    qrcode?:      string;
    exchangeRate: string;
}

@Component({
    selector: 'app-bitpay-payment-dialog-component',
    templateUrl: './bitpay-payment-dialog.component.html',
})
export class BitpayPaymentDialogComponent {
    tid:    number;
    total:  number;

    redirect_url: string;

    state = 'loading';

    external_url: string;
    mainOptions: PaymentOption[];
    otherOptions: PaymentOption[];

    display_names = {
        'BTC': 'Bitcoin',
        'ETH': 'Ethereum',
    };
    qrcode_generators = {
        'BTC': (addr, amount) => `bitcoin:${addr}` + `?amount=${amount}`,
        'ETH': (addr, amount) => `ethereum:${addr}` + `?value=${amount * 1e18}`
    };

    constructor(
        private cart: CartService,
        private rmmapi: RunboxWebmailAPI,
        public dialogRef: MatDialogRef<BitpayPaymentDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.tid = data.tx.tid;
        // not using Router here because we want the entire URL, hostname and all
        const receipt_url = window.location.href.replace(/account.*/, 'account/receipt/' + this.tid);
        const cancel_url = window.location.href;
        this.rmmapi.payWithBitpay(this.tid, receipt_url, cancel_url).subscribe(
            res => {
                this.state = 'created';
                const paymentOptions = Object.entries(res.addresses).map(([id, details], _) => {
                    let qrcode: string;
                    if (this.qrcode_generators[id]) {
                        qrcode = this.qrcode_generators[id](details['address'], details['amount']);
                    }
                    return {
                        id,
                        displayName: this.display_names[id] || id,
                        address: details['address'],
                        amount: details['amount'],
                        qrcode,
                        exchangeRate: details['exchange_rate'],
                    };
                }).sort((a, b) => a.displayName.localeCompare(b.displayName));

                this.mainOptions = paymentOptions.filter(o => o.qrcode);
                this.otherOptions = paymentOptions.filter(o => !o.qrcode);

                this.external_url = res.hosted_url;
            },
            _err => {
                this.state = 'failed';
            },
        );
    }

    close(clearCart: boolean) {
        if (clearCart) {
            this.cart.clear();
        }
        this.dialogRef.close(false);
    }
}
