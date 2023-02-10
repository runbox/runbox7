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

import { Component, OnInit, ViewChild } from '@angular/core';
import { MatLegacyTable as MatTable } from '@angular/material/legacy-table';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { AsyncSubject } from 'rxjs';

import moment from 'moment';

@Component({
    selector: 'app-account-paypal-billing-agreements-component',
    templateUrl: './paypal-billing-agreements.component.html',
})
export class PaypalBillingAgreementsComponent implements OnInit {
    billing_agreements = new AsyncSubject<any[]>();

    @ViewChild(MatTable) table: MatTable<any>;

    constructor(
        private rmmapi: RunboxWebmailAPI,
    ) {
    }

    cancelAgreement(agreement: any) {
        agreement.cancelling = new Promise((resolve, _reject) => {
            this.rmmapi.cancelPaypalBillingAgreement(agreement.paypal_id).subscribe(
            _ => {
                agreement.state = 'cancelled';
                resolve({ ok: true });
            },
            _err => {
                resolve({ ok: false });
            });
        });
    }

    ngOnInit() {
        this.rmmapi.getPaypalBillingAgreements().subscribe(agreements => {
            const sort_order = {
                active: 2,
                created: 1,
                cancelled: 0,
            };
            const a8s = agreements.map(a => {
                if (a.next_billing) {
                    a.next_billing = moment(a.next_billing, moment.ISO_8601);
                }
                return a;
            }).sort((a, b) => {
                return sort_order[b.state] - sort_order[a.state];
            });

            this.billing_agreements.next(a8s);
            this.billing_agreements.complete();
        });
    }

    getDetails(id: string): Promise<any> {
        return new Promise((resolve, _reject) => {
            this.rmmapi.getPaypalBillingAgreementDetails(id).subscribe(details => {
                details.ok = true;
                resolve(details);
            }, _err => {
                // Angular's async pipe doesn't do error handling,
                // so we have to this the old-fashioned way.
                resolve({ ok: false });
            });
        });
    }

    isRowExpanded(_index: number, row: any): boolean {
        return row.details;
    }

    toggleDetails(row: any) {
        if (row.details) {
            row.details = undefined;
        } else {
            row.details = this.getDetails(row.paypal_id);
        }
        this.table.renderRows();
    }
 }
