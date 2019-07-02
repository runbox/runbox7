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

import { Component, Inject } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

import { Contact } from './contact';

@Component({
    selector: 'app-contacts-import-dialog-component',
    templateUrl: 'vcf-import-dialog.component.html',
})
export class VcfImportDialogComponent {
    contacts: Contact[];
    groups: string[];

    choice = 'nogroup';
    target_new: string;
    target_existing: string;

    constructor(
        private dialog: MatDialog,
        public dialogRef: MatDialogRef<VcfImportDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.contacts = data['contacts'];
        this.groups   = data['groups'];
    }

    onCancelClick(): void {
        this.dialogRef.close();
    }

    onSubmitClick(): void {
        const result = {};
        if (this.choice === 'existing') {
            result['group'] = this.target_existing;
        } else if (this.choice === 'new') {
            result['group'] = this.target_new;
        }
        this.dialogRef.close(result);
    }
}
