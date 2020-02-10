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

import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-account-component-card',
        template: `
<mat-card style="min-height: 20vh; padding: 20px">
    <a [routerLink]="routerLink" style="text-decoration: none">
        <mat-card-header>
            <mat-card-title style="color: #000"> {{ title }} </mat-card-title>
            <mat-card-subtitle style="min-height: 3vh; font-size: 16px;"> {{ subtitle }} </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content style="display: flex; justify-content: center;">
            <a mat-stroked-button [routerLink]="routerLink" style="padding: 10px;">
                <mat-icon style="transform: scale(2);"> {{ icon }} </mat-icon>
            </a>
        </mat-card-content>
    </a>
</mat-card>
`
})
export class ComponentCardComponent {
    @Input() title:      string;
    @Input() subtitle:   string;
    @Input() icon:       string;
    @Input() routerLink: string;
}
