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
import { Component } from '@angular/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { AliasesEditorModalComponent } from '../aliases/aliases.editor.modal';
import { RMM } from '../rmm';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';

@Component({
    selector: 'app-aliases-lister',
    styles: [`
        .aliases-lister form > div {
            display: inline-block;
            position: relative;
            margin: 10px;
        }
        mat-divider.transparent {
            border-color: transparent;
        }
    `],
    template: `
    <div class="aliases-lister">
        <ng-content select="[section-header]" style="margin-top: 20px;"></ng-content>
        <ng-content select="[section-description]"></ng-content>
        <ng-content select="[section-buttons]"></ng-content>
        <form *ngFor="let item of aliases; let i = index;">
            <div style='width: 100%'>
                <mat-divider *ngIf="i > 0"></mat-divider>

                <mat-form-field class="alias" style="margin: 10px;">
                    <input
                        matInput
                        placeholder="Alias"
                        readonly="true"
                        [value]="item.localpart + '@' + item.domain"
                    >
                </mat-form-field>

                <mat-form-field class="forward_to" style="margin: 10px;">
                    <input
                        matInput
                        placeholder="Deliver to Account"
                        readonly="true"
                        [value]="item.forward_to"
                    >
                </mat-form-field>
                <button
                    (click)="edit(item)"
                    id="edit-alias"
                    color='primary'
                    mat-raised-button
                    style="margin: 10px;"
                >
                    Edit
                </button>

                <button
                    (click)="delete(item)"
                    id="delete-alias"
                    color='primary'
                    mat-raised-button
                    style="margin: 10px;"
                >
                    Delete
                </button>
            </div>
            <mat-divider class='transparent'></mat-divider>
        </form>

        <button 
            id="create-new-alias"
            (click)="create()"
            color='primary'
            mat-raised-button
        >
            Create New
        </button>
    </div>

        `
})
export class AliasesListerComponent {
  aliases: any[] = [];
  defaultEmail: string;

  constructor(
    private dialog: MatDialog,
    rmmapi: RunboxWebmailAPI,
    rmm: RMM,
  ) {
    rmm.alias.load().subscribe(reply => { 
        if (reply['status'] === 'success') { 
            this.aliases = reply['result']['aliases'];
        }
    });
    rmmapi.me.subscribe(me => this.defaultEmail = me.user_address);
  }

  create() {
    const dialogRef = this.dialog.open(AliasesEditorModalComponent, {
        width: '600px',
        data: { forward_to: this.defaultEmail }
    });
    dialogRef.componentInstance.isCreate = true;
    dialogRef.afterClosed().subscribe(result => {
        // FIXME: called even if the user clicks on 'Cancel'
        // FIXME: find a way to not call the callback at all
        if (result !== undefined) {
            this.aliases.push(result);
        }
    })
  }

  edit (item: object) {
    const dialogRef = this.dialog.open(AliasesEditorModalComponent, {
        width: '600px',
        data: item
    });
    dialogRef.componentInstance.isUpdate = true;
    dialogRef.afterClosed().subscribe(result => {
        if (result !== undefined) {
            const item = this.aliases.find(v => v.id === result.id);
            // modify reference
            Object.assign(item, result);
        }
    });
  }

  delete(item: object) {
    const dialogRef = this.dialog.open(AliasesEditorModalComponent, {
        width: '600px',
        data: item,
    });
    dialogRef.componentInstance.isDelete = true;
    dialogRef.afterClosed().subscribe(result => {
        if (result !== undefined) {
            const itemIndex = this.aliases.findIndex(v => v.id === result.id);
            this.aliases.splice(itemIndex, 1);
        }
    });
  }
}

