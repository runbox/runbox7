// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2019 Runbox Solutions AS (runbox.com).
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

import { Component, OnChanges, Output, EventEmitter, Input } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';

class MultipleSearchFieldsInputFormData {
  allfieldsandcontent: string = null;
  from: string = null;
  to: string = null;
  subject: string = null;
  date: string = null;
  currentfolderonly: boolean = null;
}

@Component({
  selector: 'app-multiple-search-fields-input',
  templateUrl: './multiple-search-fields-input.component.html',
  styleUrls: ['./multiple-search-fields-input.component.scss']
})
export class MultipleSearchFieldsInputComponent implements OnChanges {

  formGroup: UntypedFormGroup;

  @Input() currentFolder: string;
  @Output() searchexpression = new EventEmitter<string>();
  @Output() close = new EventEmitter();

  constructor(
    formbuilder: UntypedFormBuilder
  ) {
    this.formGroup = formbuilder.group(new MultipleSearchFieldsInputFormData());
    this.formGroup.valueChanges.subscribe(() => this.buildSearchExpression());
  }

  ngOnChanges() {
    this.buildSearchExpression();
  }

  closePanel() {
    this.close.emit(true);
  }

  buildSearchExpression() {
    let firstAnd = true;
    const and = () => {
      if (firstAnd) {
        firstAnd = false;
        return '';
      } else {
        return ' AND ';
      }
    };

    const fields = this.formGroup.value as MultipleSearchFieldsInputFormData;
    const searchexpression = (fields.currentfolderonly ? (and() + 'folder:"' + this.currentFolder.replace(/\"/g, '') + '"') : '') +
      (fields.from ? (and() + 'from:"' + fields.from.replace(/\"/g, '') + '"') : '') +
      (fields.to ? (and() + 'to:"' + fields.to.replace(/\"/g, '') + '"') : '') +
      (fields.subject ? (and() + 'subject:"' + fields.subject.replace(/\"/g, '') + '"') : '') +
      (fields.date ? (and() + 'date:' + fields.date + '') : '') +
      (fields.allfieldsandcontent ? (and() + '(' + fields.allfieldsandcontent + ')') : '');

    this.searchexpression.emit(searchexpression);
  }
}
