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
  SecurityContext,
  Component,
  Input,
  Output,
  EventEmitter,
  NgZone,
  ViewChild,
  AfterViewInit
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import {ProfilesEditorModalComponent} from './profiles.editor.modal';
import {AliasesEditorModalComponent} from '../aliases/aliases.editor.modal';
import {RMM} from '../rmm';

@Component({
    selector: 'app-profiles-lister',
    styles: [`
        .profile-form {
            padding-top: 10px;
            padding-bottom: 10px;
        }
        .profile-form form > div {
            display: inline-block;
            position: relative;
            margin: 10px;
        }
        .profile-form form > div > div {
        }
        .profile-form-item:hover {
        }
        .profile-form-item:active {
        }
        .header-image {
            border-radius: 50%;
            flex-shrink: 0;
            background-image:url(/_img/avatar.svg);
            background-size: cover;
        }
        .mat_header {
            align-items: center
        }
        .profile-lister {
            margin-top: 35px;
        }
    `],
    template: `
    <div class="profile-lister">
        <ng-content select="[section-header]" style="margin-top: 20px;"></ng-content>
        <ng-content select="[section-description]"></ng-content>
        <ng-content select="[section-buttons]"></ng-content>
        <mat-card class="mat_card" style="" *ngFor="let item of values; let i = index;"
            style='width: 600px; display: inline-flex; border-bottom: 1px solid #CCC'>
            <mat-card-content class="" style="width: 100%">
                <p>
                    <mat-grid-list cols="12" rowHeight="35px"class=''>
                        <mat-grid-tile
                            colspan="1"
                            rowspan="{{item.profile.signature?4:3}}"
                            >
                            <div mat-card-avatar class="header-image" ></div>
                        </mat-grid-tile>
                        <mat-grid-tile
                            colspan="2"
                            rowspan="1"
                            style='width: 600px;'
                            >
                            <div
                                style="text-align: right; width: 100%; margin-right: 5px;"
                                >
                                Email:
                            </div>
                        </mat-grid-tile>
                        <mat-grid-tile
                            colspan="8"
                            rowspan="1"
                            >
                            <div
                                style="text-align: left; width: 100%; margin-left: 5px;"
                                >
                                {{item.profile.email}}
                            </div>
                        </mat-grid-tile>
                        <mat-grid-tile
                            colspan="1"
                            rowspan="{{item.profile.signature?4:3}}"
                            >
                            <div
                                >
                                <button mat-raised-button (click)="edit(item)" color="primary">EDIT</button>
                            </div>
                        </mat-grid-tile>
                        <mat-grid-tile
                            colspan="2"
                            rowspan="1"
                            >
                            <div
                                style="text-align: right; width: 100%; margin-right: 5px;"
                                >
                                From name:
                            </div>
                        </mat-grid-tile>
                        <mat-grid-tile
                            colspan="8"
                            rowspan="1"
                            >
                            <div
                                style="text-align: left; width: 100%; margin-left: 5px;"
                            >
                                <strong>{{item.profile.from_name}}</strong>
                            </div>
                        </mat-grid-tile>
                        <mat-grid-tile
                            colspan="2"
                            rowspan="1"
                            >
                            <div
                                style="text-align: right; width: 100%; margin-right: 5px;"
                                >
                                Reply to:
                            </div>
                        </mat-grid-tile>
                        <mat-grid-tile
                            colspan="8"
                            rowspan="1"
                            >
                            <div
                                style="text-align: left; width: 100%; margin-left: 5px;"
                                >
                                <strong>{{item.profile.reply_to}}</strong>
                            </div>
                        </mat-grid-tile>
                        <mat-grid-tile
                            *ngIf="item.profile.signature"
                            colspan="2"
                            rowspan="1"
                            >
                            <div
                                style="text-align: right; width: 100%; margin-right: 5px;"
                                >
                                Signature:
                            </div>
                        </mat-grid-tile>
                        <mat-grid-tile
                            *ngIf="item.profile.signature"
                            colspan="8"
                            rowspan="1"
                            >
                            <div
                                style="text-align: left; width: 100%; margin-left: 5px;"
                                >
                                <div [innerHTML]="item.profile.signature"></div>
                            </div>
                        </mat-grid-tile>
                        <mat-grid-tile
                            colspan="12"
                            rowspan="1"
                            *ngIf="
                                rmm.profile.profiles
                                && rmm.profile.profiles.is_not_owner_alias
                                && rmm.profile.profiles.is_not_owner_alias[item.profile.id]
                            "
                            >
                            <div
                                style="text-align: left; width: 100%; margin-left: 5px;"
                                >
                                You are not the owner of this alias. Changes will not be saved.
                            </div>
                        </mat-grid-tile>
                        <mat-grid-tile
                            colspan="12"
                            rowspan="1"
                            *ngIf="item.profile.reference_type == 'preference' && item.profile.reference.status === 1"
                            >
                            <div
                                style="text-align: left; width: 100%; margin-left: 5px;"
                                >
                                Email not validated.
                            </div>
                        </mat-grid-tile>
                    </mat-grid-list>
                </p>
            </mat-card-content>
        </mat-card>
    </div>
    `
})
export class ProfilesListerComponent {
  @Input() values: any[];
  @Output() ev_reload = new EventEmitter<string>();
  private dialog_ref: any;
  constructor(public dialog: MatDialog,
    public rmm: RMM,
    public snackBar: MatSnackBar,
  ) {
    this.rmm.me.load();
  }
  edit (item): void {
      item = JSON.parse(JSON.stringify(item));
      this.dialog_ref = this.dialog.open(ProfilesEditorModalComponent, {
          width: '600px',
          data: item
      });

      this.dialog_ref.componentInstance.is_update = true;
      this.dialog_ref.componentInstance.css_class = 'update';
      this.dialog_ref.afterClosed().subscribe(result => {
          this.ev_reload.emit('updated');
          item = result;
      });
  }
  delete (i, item) {
      this.dialog_ref = this.dialog.open(ProfilesEditorModalComponent, {
          width: '600px',
          data: item,
      });
      this.dialog_ref.componentInstance.is_delete = true;
      this.dialog_ref.afterClosed().subscribe(result => {
          if ( this.dialog_ref.componentInstance.has_deleted ) {
              this.ev_reload.emit('deleted');
          }
      });
  }
  show_error (message, action) {
    this.snackBar.open(message, action, {
      duration: 2000,
    });
  }
}

