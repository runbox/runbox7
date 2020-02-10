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
  AfterViewInit,
  ContentChild,
  ElementRef,
  TemplateRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MatCardModule,
  MatCheckboxModule,
  MatDialogModule,
  MatExpansionModule,
  MatInputModule,
  MatListModule,
  MatPaginatorModule,
  MatProgressBarModule,
  MatProgressSpinnerModule,
  MatSelectModule,
  MatSnackBarModule,
  MatTableModule,
  MatTabsModule,
  MatChipsModule,
  MatDialog,
  MatPaginator,
  MatSnackBar,
  MatGridListModule,
} from '@angular/material';
import {MatFormFieldModule} from '@angular/material/form-field';
import {RMM} from '../rmm';

@Component({
    selector: 'app-runbox-list',
    styles: [`
    `],
    template: `
    <div class="app-runbox-list">
        <div class="header">
            <mat-toolbar color="primary">
              <mat-toolbar-row>
                <span>runbox table</span>
                <span class="spacer" style='flex-grow:1'></span>
                <span (click)="set_view_mode('small')">small</span>
                |
                <span (click)="set_view_mode('medium')">medium</span>
              </mat-toolbar-row>
            </mat-toolbar>
        </div>
        <div *ngFor="let item of values; let i = index" >
            <ng-template
                *ngIf="view_mode==='small'"
                [ngForOf]="[item]"
                [ngForTemplate]="runbox_list_row_small"
                let-item
                ngFor
            ></ng-template>
            <ng-template
                *ngIf="view_mode==='medium'"
                [ngForOf]="[item]"
                [ngForTemplate]="runbox_list_row_medium"
                let-item
                ngFor
            ></ng-template>
        </div>
    </div>
    `
})

export class RunboxListComponent {
  @Input() values: any[];
  private dialog_ref: any;
  view_mode: any;
  @ContentChild('runbox_list_row_small', {static: false}) runbox_list_row_small: TemplateRef<ElementRef>;
  @ContentChild('runbox_list_row_medium', {static: false}) runbox_list_row_medium: TemplateRef<ElementRef>;
  constructor(public dialog: MatDialog,
    public rmm: RMM,
    public snackBar: MatSnackBar,
  ) {
    this.view_mode = 'small';
  }

  show_error (message, action) {
    this.snackBar.open(message, action, {
      duration: 2000,
    });
  }
  set_view_mode(mode) {
    this.view_mode = mode;
  }
}

