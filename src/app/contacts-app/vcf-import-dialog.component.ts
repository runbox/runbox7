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
import { MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { Contact } from './contact';
import { GroupPickerDialogComponent } from './group-picker-dialog-component';

export interface VcfImportDialogResult {
    stripCategories: boolean;
    newCategory:     string;
    addToGroup:      Contact;
}

@Component({
    selector: 'app-contacts-import-dialog-component',
    templateUrl: 'vcf-import-dialog.component.html',
})
export class VcfImportDialogComponent {
    contacts: Contact[];
    categories: string[];
    groupsAvailable: Contact[];

    categoryChoice = 'nocategory';
    groupChoice = 'donothing';
    stripCategoriesChoice = 'no';

    target_group: Contact;
    target_new: string;
    target_existing: string;
    contactCategories: string[] = [];

    constructor(
        private dialog: MatDialog,
        public dialogRef: MatDialogRef<VcfImportDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.contacts   = data['contacts'];
        this.categories = data['categories'];
        this.groupsAvailable = data['groups'];

        const catsInContacts = {};
        for (const c of this.contacts) {
            for (const cat of c.categories) {
                catsInContacts[cat] = true;
            }
        }
        this.contactCategories = Object.keys(catsInContacts);
    }

    onCancelClick(): void {
        this.finish(null);
    }

    onSubmitClick(): void {
        let category: string;
        if (this.categoryChoice === 'existing') {
            category = this.target_existing;
        } else if (this.categoryChoice === 'new') {
            category = this.target_new;
        }

        const result = {
            stripCategories: this.stripCategoriesChoice === 'yes',
            newCategory:     category,
            addToGroup:      this.target_group,
        };
        this.finish(result);
    }

    selectTargetGroup(): void {
        const dialogRef = this.dialog.open(GroupPickerDialogComponent, {
            data: { groups: this.groupsAvailable }
        });
        dialogRef.afterClosed().subscribe(group => this.target_group = group);
    }

    // so that we get typechecking on close() :)
    private finish(result: VcfImportDialogResult): void {
        this.dialogRef.close(result);
    }
}
