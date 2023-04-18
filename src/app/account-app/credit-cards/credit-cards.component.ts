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
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { StripeAddCardDialogComponent } from './stripe-add-card-dialog.component';
import { RunboxWebmailAPI } from '../../rmmapi/rbwebmail';
import { ReplaySubject } from 'rxjs';
import { take } from 'rxjs/operators';
import moment from 'moment';
import { RunboxContactSupportSnackBar } from '../../common/contact-support-snackbar.service';

class CreditCard {
    id:      string;
    brand:   string;
    wallet?: string;
    last4:   string;
    created: moment.Moment;
    expires: moment.Moment;

    removing = false;

    constructor(params: any) {
        this.id      = params.id;

        this.brand   = params.card.brand;
        if (this.brand === 'visa') {
            this.brand = this.brand.toUpperCase();
        } else {
            this.brand = this.brand.charAt(0).toUpperCase() + this.brand.substr(1);
        }

        if (params.card.wallet) {
            if (params.card.wallet.type === 'apple_pay') {
                this.wallet = 'Apple Pay';
            }
        }

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
        private dialog:   MatDialog,
        private rmmapi:   RunboxWebmailAPI,
        private snackbar: RunboxContactSupportSnackBar,
    ) {
    }

    ngOnInit() {
        this.refreshCards();
    }

    addCard() {
        this.rmmapi.setupCreditCard().subscribe(
            res => {
                const dialogRef = this.dialog.open(StripeAddCardDialogComponent, { data: { clientSecret: res.client_secret } });
                dialogRef.afterClosed().subscribe(cardAdded => {
                    if (cardAdded) {
                        // not pretty, but forces the progress spinner to show up again,
                        // and it's better than looking like nothing happened
                        this.creditCards = new ReplaySubject<any>(1);
                        this.refreshCards();
                    }
                });
            },
            _err => this.snackbar.open('Failed to add a new credit card'),
        );
    }

    makeCardDefault(card: CreditCard) {
        this.rmmapi.makeCardDefault(card.id).subscribe(
            _ => this.defaultCard = card.id,
            _err => this.snackbar.open('Failed to set the default credit card'),
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
            _ => {
                this.creditCards.pipe(take(1)).subscribe(cards =>
                    this.creditCards.next(cards.filter(c => c.id !== card.id))
                );
            },
            _err => {
                this.snackbar.open('Failed to remove credit card');
                card.removing = false;
            }
        );
    }
}
