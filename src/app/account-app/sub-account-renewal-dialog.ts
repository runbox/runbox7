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

import { Component, Inject } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';

@Component({
    selector: 'app-sub-account-renewal-dialog-component',
    template: `
<h1 mat-dialog-title> Sub-account product </h1>
<div mat-dialog-content style="display: flex; flex-direction: column;">
    <div>
        <p> The following sub-accounts are associated with this product: </p>
        <ol>
            <li *ngFor="let username of product.subaccounts"> {{ username }} </li>
        </ol>
    </div>
</div>
<div mat-dialog-actions style="justify-content: space-between;">
    <button mat-button (click)="dialogRef.close()"> Close </button>
    <button mat-flat-button class="contentButton" (click)="dialogRef.close(true)">
        Renew <mat-icon svgIcon="cart"></mat-icon>
    </button>
</div>
    `,
})
export class SubAccountRenewalDialogComponent {
    product: any;

    constructor(
        public dialogRef: MatDialogRef<SubAccountRenewalDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.product = data;
    }
}
