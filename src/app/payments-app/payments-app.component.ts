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

import {
    Component,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    ViewChild,
    TemplateRef
} from '@angular/core';

import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

import { ActivatedRoute } from '@angular/router';

import { Http, ResponseContentType } from '@angular/http';
import { HttpErrorResponse } from '@angular/common/http';

import {
    MatDialog,
    MatSnackBar
} from '@angular/material';

import {
    isSameDay,
    isSameMonth,
} from 'date-fns';

import * as moment from 'moment';

import { Subject } from 'rxjs';

import { PaymentsService } from './payments.service';

@Component({
    selector: 'app-payments-app-component',
    templateUrl: './payments-app.component.html',
})
export class PaymentsAppComponent {
    subscriptions = [
        {
            id: 'micro',
            name: 'Runbox Micro',
            summary: 'Our most affordable package for individual users who just need the basics',
            details: ['you@runbox.com email addresses only', '1 GB for email and 100 MB for files'],
            price: 14.95,
        },
        {
            id: 'mini',
            name: 'Runbox Mini',
            summary: 'For regular users who need decent capacity and email hosting capabilities',
            details: ['Both you@runbox.com and you@domainyouown.com email addresses', '5 GB for email, 500 MB for files, and 5 email domains'],
            price: 29.95,
        },
        {
            id: 'medium',
            name: 'Runbox Medium',
            summary: 'Perfect for professional users and companies. Spacious and flexible with email hosting capabilities',
            details: ['Both you@runbox.com and you@domainyouown.com email addresses', '10 GB for email, 1 GB for files, and 10 email domains'],
            price: 39.95,
        },
        {
            id: 'max',
            name: 'Runbox Max',
            summary: 'For professionals and companies who need high capacity, multiple domains, and email hosting capabilities',
            details: ['Both you@runbox.com and you@domainyouown.com email addresses', '15 GB for email, 2 GB for files, and 25 email domains'],
            price: 69.95,
        },
    ];

	subaccounts = [
		{
			id: 'microsubaccount',
			name: 'Runbox Micro Sub-account',
			description: '1 GB email storage, 100 MB files storage, 100 aliases',
			price: 6.95,
		},
		{
			id: 'minisubaccount',
			name: 'Runbox Mini Sub-account',
			description: '5 GB for email, 500 MB for files, 100 aliases',
			price: 12.95,
		},
		{
			id: 'mediumsubaccount',
			name: 'Runbox Medium Sub-account',
			description: '10 GB for email, 1 GB for files, 1 domain, 100 aliases',
			price: 19.95,
		},
		{
			id: 'maxsubaccount',
			name: 'Runbox Max Sub-account',
			description: '15 GB for email, 2 GB for files, 100 aliases',
			price: 34.95,
		},
	];

	addons = [
		{
			category: 'Email add-ons',
			products: [
				{
					id: 'emaildomain',
					name: 'Email Domains',
					description: 'Additional email domains for hosting your domain\'s email with Runbox',
					price: 3.95,
				},
				{
					id: 'emailalias',
					name: 'Email Aliases',
					description: 'Extra email addresses for your account. Note: Each account already includes 100 aliases',
					price: 0.95,
				},
				{
					id: 'emailstorage',
					name: 'Email storage space',
					description: '1 GB extra storage space for your account\'s email',
					price: 7.95,
				},
				{
					id: 'filestorage',
					name: 'File storage space',
					description: '1 GB extra storage space for the files in your account\'s Files area',
					price: 7.95,
				},
			]
		},
		{
			category: 'Web & Domain Hosting add-ons',
			products: [
				{
					id: 'webhosting',
					name: 'Web Hosting',
					description: 'Web Hosting package with 250 MB storage space',
					price: 14.95,
				},
				{
					id: 'extendedwebhosting',
					name: 'Extended Web Hosting',
					description: 'Web Hosting package with 1000 MB storage space',
					price: 49.95,
				},
				{
					id: 'webhostingbandwidth',
					name: 'Extra Web Hosting bandwidth',
					description: '10 000 MB extra bandwidth per month',
					price: 7.95,
				},
			]
		}
	];

    selection = this.createForm();

    constructor(
        public  paymentsservice: PaymentsService,
        private fb:       FormBuilder,
        private snackBar: MatSnackBar,
    ) {
    }

    createForm(): FormGroup {
        return this.fb.group({
            subscription:     ['', Validators.required],
            microsubaccount:  [0,  Validators.min(0)],
            minisubaccount:   [0,  Validators.min(0)],
            mediumsubaccount: [0,  Validators.min(0)],
            maxsubaccount:    [0,  Validators.min(0)],
        });
    }
}
