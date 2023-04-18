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

import { Component, EventEmitter, Input, OnInit, Output  } from '@angular/core';
import { UntypedFormArray, UntypedFormGroup } from '@angular/forms';

@Component({
    selector: 'app-contact-details-fa-viewer',
    templateUrl: './formarray-editor.component.html',
})
export class FormArrayEditorComponent implements OnInit {
    @Input() inputFG: UntypedFormGroup;
    @Input() faName:  string;

    @Input() hidden   = true;

    @Input() title:             string;
    @Input() valuePlaceholder:  string;
    @Input() deleteDescription: string;
    @Input() addNewDescription: string;

    @Output() newElementClicked = new EventEmitter<any>();
    @Output() startVideoCall = new EventEmitter<string>();

    faObj: UntypedFormArray;

    defaultTypesFor = {
        emails:    ['home', 'work'],
        related:   ['child', 'spouse'],
        phones:    ['home', 'work', 'cell', 'fax'],
        urls:      ['personal', 'work'],
        addresses: ['home', 'work'],
    };

    constructor() {
    }

    ngOnInit() {
        this.faObj = this.inputFG.get(this.faName) as UntypedFormArray;
    }

    removeAt(i: number): void {
        this.faObj.removeAt(i);
    }
}
