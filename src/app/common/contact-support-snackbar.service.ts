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

import { Component, Inject, Injectable } from '@angular/core';
import { MatSnackBar, MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class RunboxContactSupportSnackBar {
    constructor(private snackbar: MatSnackBar) {}

    public open(error: string) {
        this.snackbar.openFromComponent(RunboxContactSupportSnackBarContent, {
            data: { error },
            duration: 5000,
        });
    }
}

@Component({
    selector: 'app-common-contact-support-snackbar-content',
    template: `
<app-runbox-contact-support>
    {{ error }}
</app-runbox-contact-support>
    `,
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class RunboxContactSupportSnackBarContent {
    error: string;

    constructor(
        @Inject(MAT_SNACK_BAR_DATA) data: any
    ) {
        this.error = data?.error;
    }
}
