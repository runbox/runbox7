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

import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';

import { ErrorReportingDialogComponent } from './error-reporting-dialog.component';

@Injectable()
export class ErrorReportingService {
    constructor(
        private dialog: MatDialog,
    ) {
    }

    handle(error: HttpErrorResponse): void {
        console.log("ERROR REPORTING SERVICE IS ON THE CASE!");
        console.log(error);

        // keep only the matched action
        const action = error.url.replace(/.*rest\/v1\//, '');

        let error_id: string;

        // check if it's the expected error ID, and not some irrelevant garbage
        if (error.error.match(/^\d+\.\d+\.\d+$/)) {
            error_id = error.error;
        }

        const dialogRef = this.dialog.open(ErrorReportingDialogComponent, {
            data: { action: action, error_id: error_id }
        });
        dialogRef.afterClosed().subscribe(result => {
            if (result.submit) {
                // submit result.details along with action and error_id somewhere :)
            }

        });
    }
}
