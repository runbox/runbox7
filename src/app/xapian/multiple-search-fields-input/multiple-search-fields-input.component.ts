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
import { FormBuilder } from '@angular/forms';
import { distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-multiple-search-fields-input',
  templateUrl: './multiple-search-fields-input.component.html',
  styleUrls: ['./multiple-search-fields-input.component.scss']
})
export class MultipleSearchFieldsInputComponent implements OnChanges {

  formGroup;

  @Input() currentFolder: string;
  @Output() searchexpression = new EventEmitter<string>();
  @Output() close = new EventEmitter();

  constructor(
    formbuilder: FormBuilder
  ) {
    this.formGroup = formbuilder.group({
      allfieldsandcontent: [''],
      from: [''],
      to: [''],
      subject: [''],
      date: [''],
      currentfolderonly: [false],
      hasAttachment: [false],
      hasReply: [false],
      hasFlag: [false],
      unreadOnly: [{value: false, disabled: true}]
    });

    this.formGroup.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe(() => {
      this.enableDisableUnread();
      this.buildSearchExpression()
    });
  }

  ngOnChanges() {
    this.enableDisableUnread();
    this.buildSearchExpression();
  }

  closePanel() {
    this.close.emit(true);
  }

  enableDisableUnread() {
    const fields = this.formGroup.value;
    if (fields.allfieldsandcontent && fields.allfieldsandcontent.length > 0 || fields.hasAttachment || fields.hasReply || fields.hasFlag) {
      this.formGroup.controls['unreadOnly'].enable({emitEvent: false});
    } else {
      this.formGroup.controls['unreadOnly'].disable({emitEvent: false});
    }
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

    const fields = this.formGroup.value;
    const searchexpression = (fields.currentfolderonly ? (and() + 'folder:"' + this.currentFolder.replace(/\"/g, '') + '"') : '') +
      (fields.from ? (and() + 'from:"' + fields.from.replace(/\"/g, '') + '"') : '') +
      (fields.to ? (and() + 'to:"' + fields.to.replace(/\"/g, '') + '"') : '') +
      (fields.subject ? (and() + 'subject:"' + fields.subject.replace(/\"/g, '') + '"') : '') +
      (fields.allfieldsandcontent ? (and() + '(' + fields.allfieldsandcontent + ')') : '') +
      (fields.hasAttachment ? (and() + 'flag:attachment') : '') +
      (fields.hasReply ? (and() + 'flag:answered') : '') +
      (fields.hasFlag ? (and() + 'flag:flagged') : '') +
      (fields.date ? (and() + 'date:' + fields.date + '') : '') + // FIXME: This parameter must come last
      (fields.unreadOnly ? (and() + 'NOT flag:seen') : ''); // FIXME: This parameter must also come last...

    this.searchexpression.emit(searchexpression);
  }
}
