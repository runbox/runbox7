// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2020 Runbox Solutions AS (runbox.com).
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
import { Component, Input } from '@angular/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { RMM } from '../rmm';

@Component({
    selector: 'app-runbox-dynamic-builder-component',
    styles: [`
    `],
    template: `
    <div class="app-runbox-dynamic-builder-component">
        <div *ngIf="elem['rows']">
            <div *ngFor="let row of elem.rows" style="">
                <!-- loop in rows -- [attributes] used to bind values should have the same [attr-name] -->
                <div [style]="'flex-direction: row; ' + row.style">
                    <div *ngFor="let col of row.cols" [style]="'display: flex; flex-direction: column; ' + col.style">
                        <div *ngIf="col.type === 'form'; else elseBlock">
                            <!-- loop in form rows -->
                            <form [class]="col.class">
                                <!-- form -->
                                <div
                                    [style]="'display: flex; flex-direction: row; ' + row.style"
                                    *ngFor="let row of col.rows"
                                    [cols]="row.cols.length"
                                >
                                    <div
                                        *ngFor="let col of row.cols"
                                        [style]="'flex-direction: column; ' + col.style"
                                        [class]="col.class"
                                    >
                                        <!-- recursive call -->
                                        <app-runbox-dynamic-builder-component [elem]="col">
                                        </app-runbox-dynamic-builder-component>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <ng-template #elseBlock>
                            <div>
                                <!-- recursive call -->
                                <app-runbox-dynamic-builder-component [elem]="col">
                                </app-runbox-dynamic-builder-component>
                            </div>
                        </ng-template>
                    </div>
                </div>
            </div>
        </div>
        <div *ngIf="!elem['rows']">
            <div *ngIf="elem.type === 'code'">
                <pre
                    [class]="elem.class"
                    [style]="elem.style"
                >
                    <code [innerHTML]="elem.text"></code>
                </pre>
            </div>
            <div *ngIf="elem.type === 'p'">
                <p
                    [class]="elem.class"
                    [style]="elem.style"
                >
                    {{elem.text}}
                </p>
            </div>
            <div *ngIf="elem.type === 'h1'">
                <h1
                    [class]="elem.class"
                    [style]="elem.style"
                >
                    {{elem.text}}
                </h1>
            </div>
            <div *ngIf="elem.type === 'h2'">
                <h2
                    [class]="elem.class"
                    [style]="elem.style"
                >
                    {{elem.text}}
                </h2>
            </div>
            <div *ngIf="elem.type === 'input'">
                <!-- input -->
                <mat-form-field [class]="elem.class">
                    <mat-label *ngIf="elem.label">
                        {{elem.label.text}}
                    </mat-label>
                    <input
                        matInput
                        [type]="elem.type"
                        [placeholder]="elem.input.placeholder"
                        [(ngModel)]="elem.value"
                    >
                </mat-form-field>
                <mat-error *ngFor="let error of elem.errors" [innerHTML]="error"></mat-error>
            </div>
            <div *ngIf="elem.type === 'button'">
                <!-- button -->
                <button
                    mat-raised-button
                    (click)="elem.button.event && elem.button.event.click ? elem.button.event.click($event) : false"
                    [class]="elem.class"
                    [colmor]="elem.button.color || 'warn'"
                    [disabled]="elem.button.disabled || false"
                    [style]="elem.style"
                >
                        {{elem.button.text}}
                </button>
            </div>
        </div>
    </div>
    `
})

export class RunboxDynamicBuilderComponent {
  @Input() sidebar_opened = false;
  @Input() elem = {};
  constructor(public dialog: MatDialog,
    public rmm: RMM,
    public snackBar: MatSnackBar,
  ) {
  }

}

