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
import { AliasesEditorModalComponent } from './aliases.editor.modal';
import { RMM } from '../rmm';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';

@Component({
  selector: 'app-aliases-lister',
  styleUrls: ['aliases.lister.scss'],
  templateUrl: 'aliases.lister.html'
})
export class AliasesListerComponent {
  aliases: any[] = [];
  domains: string[] = [];
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
    rmmapi.getRunboxDomains().subscribe(domains => this.domains = domains);
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
            const alias = this.aliases.find(v => v.id === result.id);
            // modify reference
            Object.assign(alias, result);
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

