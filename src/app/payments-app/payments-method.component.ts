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

import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'app-payments-method',
    template: `
<mat-card>
    <div style="height: 120px">
        <img mat-card-image src="{{ logo }}" alt="{{ logo_alt }}"
             style="width: 350px">
    </div>
    <mat-card-content>
        <ng-content>
        </ng-content>
    </mat-card-content>
    <mat-card-actions style="display: flex; justify-content: center; align-items: center;">
        <button mat-flat-button color="primary" (click)="clicked.emit()">PROCEED TO PAYMENT</button>
    </mat-card-actions>
</mat-card>
    `,
})
export class PaymentMethodComponent {
    @Input() logo:     string;
    @Input() logo_alt: string;

    @Output() clicked = new EventEmitter();
}
