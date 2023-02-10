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
import {
  Component,
  Input,
  Inject,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { RMM } from '../rmm';

@Component({
    selector: 'app-aliases-edit',
    styles: [`
    .mat_header {
        padding: 10px 0 10px 10px
    }
    .mat_card.update .mat_header,
    .mat_card.create .mat_header {
        background-color: #013b69;
     }
    .header-image {
       border-radius: 50%;
       flex-shrink: 0;
       background-image:url(/_img/avatar.svg);
       background-size: cover;
    }
    `],
    template: `
        <mat-card class="mat_card css_class" style="padding: 0px">
          <mat-card-header class="mat_header">
              <div mat-card-avatar class="header-image" >
              </div>
              <mat-card-title >
                  <div *ngIf="is_create" style="color: #FFF;">Create alias</div>
                  <div *ngIf="is_update" style="color: #FFF;">{{data.localpart + '@' + data.domain}}</div>
                  <div *ngIf="is_delete" style="color: #000;">Delete alias {{data.localpart + '@' + data.domain}} ?</div>
              </mat-card-title>
              <mat-card-subtitle>
                  <div *ngIf="is_update" style="color: #FFF;">Forwards to: {{data.forward_to}}</div>
                  <div *ngIf="is_delete" style="color: #000;">Forwards to: {{data.forward_to}}</div>
              </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
                <div mat-dialog-content>
                    <form>
                        <mat-form-field style="margin: 10px; width: 40%;">
                            <input matInput placeholder="Localpart"
                                name="localpart"
                                [readonly]="!is_create"
                                [(ngModel)]="data.localpart"
                                (ngModelChange)="onchange_field('localpart')"
                            >
                            <div *ngIf="field_errors && field_errors.localpart">
                                <mat-hint>
                                    ie. My main profile
                                </mat-hint>
                                <mat-error *ngFor="let error of field_errors.localpart; let i = index;">
                                    {{error}}
                                </mat-error>
                            </div>
                        </mat-form-field>
                        @
                        <mat-form-field style="margin: 10px; width: 40%;" *ngIf="is_create">
                            <mat-label>Domain</mat-label>
                            <mat-select
                                name="domain"
                                [disabled]="!is_create"
                                [(ngModel)]="data.domain"
                                (ngModelChange)="onchange_field('domain')"
                            >
                                <mat-option *ngFor="let domain of allowed_domains" [value]="domain">
                                    {{domain}}
                                </mat-option>
                            </mat-select>
                            <div *ngIf="field_errors && field_errors.domain">
                                <mat-hint>
                                    ie. jamesbond@runbox.com
                                </mat-hint>
                                <mat-error *ngFor="let error of field_errors.domain; let i = index;">
                                    {{error}}
                                </mat-error>
                            </div>
                        </mat-form-field>
                        <mat-form-field style="margin: 10px; width: 45%;" *ngIf="!is_create">
                            <input matInput placeholder="Domain"
                                name="domain"
                                readonly
                                [(ngModel)]="data.domain"
                                (ngModelChange)="onchange_field('domain')"
                            >
                        </mat-form-field>
                        <mat-form-field style="margin: 10px; width: 95%;">
                            <input matInput placeholder="Deliver to account"
                                name="forward_to"
                                [(ngModel)]="data.forward_to"
                                (ngModelChange)="onchange_field('forward_to')"
                            >
                            <mat-hint>
                                ie. you@runbox.com
                            </mat-hint>
                            <div *ngIf="field_errors && field_errors.forward_to">
                                <mat-hint>
                                    ie. James Bond
                                </mat-hint>
                                <mat-error *ngFor="let error of field_errors.forward_to; let i = index;">
                                    {{error}}
                                </mat-error>
                            </div>
                        </mat-form-field>
                    </form>
                </div>
          </mat-card-content>
          <mat-card-actions style="padding: 0px 10px">
            <button mat-raised-button (click)="save()" color="primary" *ngIf="!is_delete">SAVE</button>
            <button mat-raised-button (click)="delete()" color="" *ngIf="is_delete">DELETE</button>
            <button mat-raised-button (click)="close()" color="warn">CANCEL</button>
          </mat-card-actions>
          <mat-card-footer>
          </mat-card-footer>
        </mat-card>
    `
})

export class AliasesEditorModalComponent {
    @Input() value: any[];
    field_errors;
    is_create = false;
    is_update = false;
    is_delete = false;
    has_deleted = false;
    has_updated = false;
    has_created = false;
    allowed_domains = [];
    css_class: string;
    constructor(
        private http: HttpClient,
        public snackBar: MatSnackBar,
        public dialog_ref: MatDialogRef<AliasesEditorModalComponent>,
        @Inject(MAT_DIALOG_DATA)
        public data: any,
        public rmm: RMM,
    ) {
        this.load_allowed_domains();
    }
    load_allowed_domains() {
        const req = this.http.get('/rest/v1/alias/allowed_domains')
            .pipe(timeout(10000))
            ;
        req.subscribe(
          reply => {
            this.allowed_domains = reply['result'].allowed_domains;
            return;
        });
    }
    save() {
        if ( this.is_create ) {
            this.create();
        } else {
            this.update();
        }
    }
    create() {
        const data = this.data;
        const req = this.rmm.alias.create({
            localpart: data.localpart,
            domain: data.domain,
            forward_to: data.forward_to,
        }, this.field_errors);
        req.subscribe( reply => {
            if ( reply['status'] === 'success' ) {
                this.has_created = true;
                this.close();
            }
        });
    }
    delete() {
        const data = this.data;
        const req = this.rmm.alias.delete(data.id);
        req.subscribe( reply => {
            if ( reply['status'] === 'success' ) {
                this.has_deleted = true;
                return this.close();
            }
        });
    }
    update() {
        const data = this.data;
        const values = {
            forward_to : this.data.forward_to,
        };
        const req = this.rmm.alias.update(data.id, values, this.field_errors);
        req.subscribe( reply => {
            if ( reply['status'] === 'success' ) {
                this.rmm.alias.load();
                return this.close();
            }
          },
        );
    }
    close() {
        this.dialog_ref.close({});
    }
    onchange_field ( field ) {
        if ( this.field_errors && this.field_errors[field] ) {
            this.field_errors[field] = [];
        }
    }
}

