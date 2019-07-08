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

import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';

import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Observable, Subject, ReplaySubject } from 'rxjs';
import { Product } from './product';

@Injectable()
export class PaymentsService {
    errorLog = new Subject<HttpErrorResponse>();
    products = new ReplaySubject<Product[]>();

    MOCK_PRODUCTS = [
        {
            id: 'micro',
            pid: 1001,
            type: 'subscription',
            name: 'Runbox Micro',
            description: 'Our most affordable package for individual users who just need the basics',
            details: ['you@runbox.com email addresses only', '1 GB for email and 100 MB for files'],
            price: 14.95,
        },
        {
            id: 'mini',
            pid: 1002,
            type: 'subscription',
            name: 'Runbox Mini',
            description: 'For regular users who need decent capacity and email hosting capabilities',
            details: ['Both you@runbox.com and you@domainyouown.com email addresses', '5 GB for email, 500 MB for files, and 5 email domains'],
            price: 29.95,
        },
        {
            id: 'medium',
            pid: 1003,
            type: 'subscription',
            name: 'Runbox Medium',
            description: 'Perfect for professional users and companies. Spacious and flexible with email hosting capabilities',
            details: ['Both you@runbox.com and you@domainyouown.com email addresses', '10 GB for email, 1 GB for files, and 10 email domains'],
            price: 39.95,
        },
        {
            id: 'max',
            pid: 1004,
            type: 'subscription',
            name: 'Runbox Max',
            description: 'For professionals and companies who need high capacity, multiple domains, and email hosting capabilities',
            details: ['Both you@runbox.com and you@domainyouown.com email addresses', '15 GB for email, 2 GB for files, and 25 email domains'],
            price: 69.95,
        },
        {
            id: 'microsubaccount',
            pid: 110,
            type: 'addon',
            subtype: 'subaccount',
            name: 'Runbox Micro Sub-account',
            description: '1 GB email storage, 100 MB files storage, 100 aliases',
            price: 6.95,
        },
        {
            id: 'minisubaccount',
            pid: 105,
            type: 'addon',
            subtype: 'subaccount',
            name: 'Runbox Mini Sub-account',
            description: '5 GB for email, 500 MB for files, 100 aliases',
            price: 12.95,
        },
        {
            id: 'mediumsubaccount',
            pid: 101,
            type: 'addon',
            subtype: 'subaccount',
            name: 'Runbox Medium Sub-account',
            description: '10 GB for email, 1 GB for files, 1 domain, 100 aliases',
            price: 19.95,
        },
        {
            id: 'maxsubaccount',
            pid: 115,
            type: 'addon',
            subtype: 'subaccount',
            name: 'Runbox Max Sub-account',
            description: '15 GB for email, 2 GB for files, 100 aliases',
            price: 34.95,
        },
        {
            id: 'emaildomain',
            pid: 57,
            type: 'addon',
            subtype: 'emailaddon',
            name: 'Email Domains',
            description: 'Additional email domains for hosting your domain\'s email with Runbox',
            price: 3.95,
        },
        {
            id: 'emailalias',
            pid: 56,
            type: 'addon',
            subtype: 'emailaddon',
            name: 'Email Aliases',
            description: 'Extra email addresses for your account. Note: Each account already includes 100 aliases',
            price: 0.95,
        },
        {
            id: 'emailstorage',
            pid: 1,
            type: 'addon',
            subtype: 'emailaddon',
            name: 'Email storage space',
            description: '1 GB extra storage space for your account\'s email',
            price: 7.95,
        },
        {
            id: 'filestorage',
            pid: 2,
            type: 'addon',
            subtype: 'emailaddon',
            name: 'File storage space',
            description: '1 GB extra storage space for the files in your account\'s Files area',
            price: 7.95,
        },
        {
            id: 'webhosting',
            pid: 200,
            type: 'addon',
            subtype: 'hosting',
            name: 'Web Hosting',
            description: 'Web Hosting package with 250 MB storage space',
            price: 14.95,
        },
        {
            id: 'extendedwebhosting',
            pid: 210,
            type: 'addon',
            subtype: 'hosting',
            name: 'Extended Web Hosting',
            description: 'Web Hosting package with 1000 MB storage space',
            price: 49.95,
        },
        {
            id: 'webhostingbandwidth',
            pid: 202,
            type: 'addon',
            subtype: 'hosting',
            name: 'Extra Web Hosting bandwidth',
            description: '10 000 MB extra bandwidth per month',
            price: 7.95,
        },
    ];

    constructor(
        private rmmapi:   RunboxWebmailAPI,
    ) {
        this.products.next(this.MOCK_PRODUCTS);
    }

    apiErrorHandler(e: HttpErrorResponse): void {
        this.errorLog.next(e);
    }
}
