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

import { Component, Input, OnInit, ElementRef, ViewChild } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';

@Component({
    selector: 'app-contact-details-multivalue-editor',
    template: `
<div>
    <mat-form-field *ngIf="promptShown">
        <input matInput #newValueInput placeholder="{{ newValueLabel }}"
              [(ngModel)]="newValue" [ngModelOptions]="{standalone: true}">
        <!-- <mat-hint align="start"> Press Enter to confirm </mat-hint> -->
        <button matSuffix mat-icon-button (click)="promptShown = false">
            <mat-icon svgIcon="cancel"></mat-icon>
        </button>
        <button matSuffix mat-icon-button (click)="confirmValue()">
            <mat-icon svgIcon="check"></mat-icon>
        </button>
    </mat-form-field>
    <mat-form-field *ngIf="!promptShown">
        <mat-label> {{ label }} </mat-label>
        <mat-select [formControl]="inputFC" placeholder="{{ noValuesLabel }}" multiple>
            <mat-select-trigger>
                <span *ngIf="inputFC.value; else no_values">
                    {{ inputFC.value }}
                </span>
                <ng-template #no_values>
                    {{ noValuesLabel }}
                </ng-template>
            </mat-select-trigger>
            <mat-option *ngFor="let option of options" [value]="option"> {{ option }} </mat-option>
            <mat-option (click)="showNewValuePrompt()"> {{ newValueLabel }}... </mat-option>
        </mat-select>
    </mat-form-field>
</div>
    `,
})
export class MultiValueEditorComponent implements OnInit {
    @ViewChild('newValueInput') newValueElement: ElementRef;

    @Input() inputFC: UntypedFormControl;

    @Input() label: string;
    @Input() noValuesLabel: string;
    @Input() newValueLabel: string;

    @Input() defaultOptions: string[] = [];
    options: string[];

    newValue = '';
    promptShown = false;

    constructor() {
    }

    ngOnInit() {
        this.options = this.defaultOptions.concat(this.inputFC.value);
    }

    confirmValue() {
        this.options.push(this.newValue);

        const values = this.inputFC.value;
        values.push(this.newValue);
        this.inputFC.setValue(values);

        this.newValue = '';
        this.promptShown = false;
    }

    showNewValuePrompt() {
        // clear the newly added 'undefined' from input
        let values = this.inputFC.value;
        values = values.filter(c => c);
        this.inputFC.setValue(values);

        this.promptShown = true;
        setTimeout(() => this.newValueElement.nativeElement.focus());
    }
}
