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
import { timeout } from 'rxjs/operators';
import { Component, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { RMM } from '../rmm';

@Component({
    selector: 'app-aliases-edit',
    styleUrls: ['aliases.lister.scss'],
    templateUrl: 'aliases.editor.modal.html',
})

export class AliasesEditorModalComponent {
    fieldErrors: any = {};
    isCreate = false;
    isUpdate = false;
    isDelete = false;
    allowedDomains = [];

    constructor(
        http: HttpClient,
        private dialogRef: MatDialogRef<AliasesEditorModalComponent>,
        @Inject(MAT_DIALOG_DATA)
        public data: any,
        private rmm: RMM,
    ) {
        http.get('/rest/v1/alias/allowed_domains')
            .pipe(timeout(10000))
            .subscribe(reply => {
                this.allowedDomains = reply['result'].allowed_domains;
            });
    }

    save() {
        if (this.isCreate) {
            this.create();
        } else {
            this.update();
        }
    }

    create() {
        const data = this.data;
        this.rmm.alias
            .create({
                localpart: data.localpart,
                domain: data.domain,
                forward_to: data.forward_to,
            }, this.fieldErrors)
            .subscribe( reply => {
                if (reply['status'] === 'success') {
                    // merge ID with existing data
                    const created = {...data, ...reply['result'].alias};
                    return this.close(created);
                }
            });
    }

    delete() {
        const data = this.data;
        this.rmm.alias
            .delete(data.id)
            .subscribe( reply => {
                if (reply['status'] === 'success') {
                    return this.close(data);
                }
            });
    }

    update() {
        const data = this.data;
        const values = {
            forward_to : this.data.forward_to,
        };
        this.rmm.alias
            .update(data.id, values, this.fieldErrors)
            .subscribe( reply => {
                if (reply['status'] === 'success') {
                    return this.close(reply['result']);
                }
            });
    }

    cancel() {
        this.dialogRef.close();
    }

    close(result: object) {
        this.dialogRef.close(result);
    }

    onChangeField (field: string) {
        if (this.fieldErrors && this.fieldErrors[field]) {
            this.fieldErrors[field] = [];
        }
    }
}

