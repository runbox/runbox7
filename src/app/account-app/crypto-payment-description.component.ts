// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2021 Runbox Solutions AS (runbox.com).
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

import { Component, Input } from '@angular/core';
import { PaymentOption } from './bitpay-payment-dialog.component';

@Component({
    selector: 'app-crypto-payment-description',
        template: `
<p>
    Send <strong>{{ payment.amount }} {{ payment.id }}</strong>
    <button mat-icon-button [cdkCopyToClipboard]="payment.amount">
        <mat-icon svgIcon="clipboard-text"></mat-icon>
    </button>
    to <br>
    <strong>{{ payment.address }} </strong>
    <button mat-icon-button [cdkCopyToClipboard]="payment.address">
        <mat-icon svgIcon="clipboard-text"></mat-icon>
    </button>
    <br>
    <small> 1 {{ payment.id }} = {{ payment.exchangeRate }} USD </small>
</p>
`
})
export class CryptoPaymentDescriptionComponent {
    @Input() payment: PaymentOption;
}
