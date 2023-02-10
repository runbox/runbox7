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
import {
  Component,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { AliasesEditorModalComponent } from '../aliases/aliases.editor.modal';
import { RMM } from '../rmm';

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
        <form *ngFor="let item of values; let i = index;">
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
<!--
                <button
                    (click)="edit(item)"
                    color='primary'
                    mat-raised-button
                    style="margin: 10px;"
                >
                    Edit
                </button>

                <button
                    (click)="delete(i, item)"
                    *ngIf="!is_delete_disabled"
                    color='primary'
                    mat-raised-button
                    style="margin: 10px;"
                >
                    Delete
                </button>
-->
            </div>
            <mat-divider class='transparent'></mat-divider>
        </form>
    </div>

        `
})
export class AliasesListerComponent {
  @Input() values: any[];
  @Input() is_delete_disabled: false;
  @Output() ev_reload = new EventEmitter<string>();
  private dialog_ref: any;
  visible_code_check = {};
  constructor(public dialog: MatDialog,
    public snackBar: MatSnackBar,
    public rmm: RMM,
  ) {}
  edit (item): void {
      item = JSON.parse(JSON.stringify(item));
      this.dialog_ref = this.dialog.open(AliasesEditorModalComponent, {
          width: '600px',
          data: item
      });
      this.dialog_ref.afterClosed().subscribe(result => {
          item = result;
      });
      this.dialog_ref.componentInstance.is_update = true;
      this.dialog_ref.componentInstance.css_class = 'update';
  }
  delete (i, item) {
    this.dialog_ref = this.dialog.open(AliasesEditorModalComponent, {
        width: '600px',
        data: item,
    });
    this.dialog_ref.componentInstance.is_delete = true;
      this.dialog_ref.componentInstance.css_class = 'delete';
    this.dialog_ref.afterClosed().subscribe(result => {
    });
  }
  show_error (message, action) {
    this.snackBar.open(message, action, {
      duration: 2000,
    });
  }
}

