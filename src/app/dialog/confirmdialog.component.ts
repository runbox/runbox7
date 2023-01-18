// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2018 Runbox Solutions AS (runbox.com).
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

/* 
 *  Copyright 2010-2016 FinTech Neo AS ( fintechneo.com )- All rights reserved
 */

import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
    moduleId: 'angular2/app/dialog/',
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'confirm-dialog',
    templateUrl: 'confirmdialog.component.html'
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class ConfirmDialog {
    yesOptionTitle = 'ok';
    noOptionTitle = 'cancel';
    title = 'Please confirm action';
    question = 'Are you sure?';

    constructor(public dialogRef: MatDialogRef<ConfirmDialog>) {

    }
}
