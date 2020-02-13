// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2020 Runbox Solutions AS (runbox.com).
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

import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RunboxWebmailAPI } from '../../rmmapi/rbwebmail';
import { ReplaySubject } from 'rxjs';
import { take } from 'rxjs/operators';
import * as moment from 'moment';

class CreditCard {
    id:      string;
    brand:   string;
    last4:   string;
    created: moment.Moment;
    expires: moment.Moment;

    removing = false;

    constructor(params: any) {
        this.id      = params.id;
        this.brand   = params.card.brand.toUpperCase();
        this.last4   = params.card.last4;
        this.created = moment.utc(params.created * 1000);
        this.expires = moment({ year: params.card.exp_year, month: params.card.exp_month - 1 }).endOf('month');
    }
}

@Component({
    selector: 'app-credit-cards',
    templateUrl: './credit-cards.component.html',
    styleUrls: ['./credit-cards.component.scss']
})
export class CreditCardsComponent implements OnInit {
    creditCards = new ReplaySubject<any>(1);
    defaultCard: string;
    loadingFail = false;

    constructor(
        private rmmapi:   RunboxWebmailAPI,
        private snackbar: MatSnackBar,
    ) {
    }

    ngOnInit() {
        this.refreshCards();
    }

    makeCardDefault(card: CreditCard) {
        this.rmmapi.makeCardDefault(card.id).subscribe(
            res => this.defaultCard = card.id,
            _err => this.snackbar.open('Failed to set the default credit card', 'Okay'),
        );
    }

    refreshCards() {
        this.loadingFail = false;
        this.rmmapi.getCreditCards().subscribe(
            result => {
                const ccs = result.payment_methods.map(c => new CreditCard(c));
                this.creditCards.next(ccs);
                this.defaultCard = result.default;
            },
            _err => this.loadingFail = true,
        );
    }

    removeCard(card: CreditCard) {
        this.rmmapi.detachCreditCard(card.id).subscribe(
            res => {
                this.creditCards.pipe(take(1)).subscribe(cards =>
                    this.creditCards.next(cards.filter(c => c.id !== card.id))
                );
            },
            _err => {
                this.snackbar.open(
                    'Failed to remove credit card. Try again later or contact Runbox Support',
                    'Okay'
                );
                card.removing = false;
            }
        );
    }
}
