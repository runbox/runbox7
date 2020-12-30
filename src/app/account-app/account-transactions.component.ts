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

import { Component, OnInit } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { AsyncSubject } from 'rxjs';
import * as moment from 'moment';
import { MobileQueryService } from '../mobile-query.service';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';

// TODO a proper interface for this
type Transaction = any;

@Component({
    selector: 'app-account-transactions-component',
    templateUrl: './account-transactions.component.html',
    styleUrls: ['./mobiletables.scss'],
    animations: [
        trigger('detailExpand', [
            state('collapsed', style({height: '0px', minHeight: '0'})),
            state('expanded', style({height: '*'})),
            transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
        ]),
    ],
})
export class AccountTransactionsComponent implements OnInit {
    transactions = new AsyncSubject<Transaction[]>();
    expandedTransaction: Transaction;

    columnsDefault = ['amount', 'status', 'method', 'time', 'time-desc', 'receipt'];
    columnsMobile  = ['expansionIndicator', 'time', 'amount', 'statusIcon'];

    displayedColumns: string[];

    methods = {
        bitpay:     'Bitpay',
        creditcard: 'Netaxept',
        giro:       'Offline',
        paypal:     'PayPal',
        stripe:     'Stripe',
    };

    statuses = {
        0: 'Successful',
        1: 'Pending',
        2: 'Refunded',
    };

    constructor(
        public  mobileQuery: MobileQueryService,
        private rmmapi: RunboxWebmailAPI,
    ) {
        this.displayedColumns = this.mobileQuery.matches ? this.columnsMobile : this.columnsDefault;
        this.mobileQuery.changed.subscribe(mobile => {
            this.displayedColumns = mobile ? this.columnsMobile : this.columnsDefault;
            if (!mobile) {
                this.expandedTransaction = null;
            }
        });
    }

    ngOnInit() {
        this.rmmapi.getTransactions().subscribe(transactions => {
            const txns = transactions.map(t => {
                t.time = moment(t.time, moment.ISO_8601);
                return t;
            });

            txns.reverse();
            this.transactions.next(txns);
            this.transactions.complete();
        });
    }

    rowClicked(t: Transaction) {
        if (this.mobileQuery.matches) {
            this.expandedTransaction = this.expandedTransaction === t ? null : t;
        }
    }

}
