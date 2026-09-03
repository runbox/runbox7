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

import { Component, OnChanges, Output, EventEmitter, Input, SimpleChanges } from '@angular/core';
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
  @Input() searchExpression = '';
  @Output() searchexpression = new EventEmitter<string>();
  @Output() close = new EventEmitter();

  private lastEmittedSearchExpression = '';

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
      this.buildSearchExpression();
    });
  }

  ngOnChanges(changes?: SimpleChanges) {
    if (changes && changes.searchExpression && this.searchExpression !== this.lastEmittedSearchExpression) {
      this.updateFormFromSearchExpression(this.searchExpression || '');
      return;
    }

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

    this.lastEmittedSearchExpression = searchexpression;
    this.searchexpression.emit(searchexpression);
  }

  private updateFormFromSearchExpression(searchExpression: string): void {
    this.formGroup.patchValue(this.parseSearchExpression(searchExpression), { emitEvent: false });
    this.enableDisableUnread();
  }

  private parseSearchExpression(searchExpression: string) {
    const fields = {
      allfieldsandcontent: '',
      from: '',
      to: '',
      subject: '',
      date: '',
      currentfolderonly: false,
      hasAttachment: false,
      hasReply: false,
      hasFlag: false,
      unreadOnly: false
    };
    let remaining = searchExpression.trim();

    remaining = this.consumeQuotedTerm(remaining, 'from', value => fields.from = value);
    remaining = this.consumeQuotedTerm(remaining, 'to', value => fields.to = value);
    remaining = this.consumeQuotedTerm(remaining, 'subject', value => fields.subject = value);
    remaining = remaining.replace(/\bfolder:"([^"]*)"/g, (match, value) => {
      if (value === this.currentFolder) {
        fields.currentfolderonly = true;
        return ' ';
      }
      return match;
    });
    remaining = this.consumeTerm(remaining, /\bdate:([^\s)]+)/g, value => fields.date = value);
    remaining = this.consumeFlag(remaining, 'attachment', () => fields.hasAttachment = true);
    remaining = this.consumeFlag(remaining, 'answered', () => fields.hasReply = true);
    remaining = this.consumeFlag(remaining, 'flagged', () => fields.hasFlag = true);
    remaining = this.consumeTerm(remaining, /\bNOT\s+flag:seen\b/g, () => fields.unreadOnly = true);

    remaining = remaining.replace(/\(([^()]*)\)/, (_match, value) => {
      fields.allfieldsandcontent = value;
      return ' ';
    });
    remaining = this.cleanDanglingAnd(remaining);
    if (remaining) {
      fields.allfieldsandcontent = fields.allfieldsandcontent
        ? `${fields.allfieldsandcontent} ${remaining}`
        : remaining;
    }

    return fields;
  }

  private consumeQuotedTerm(searchExpression: string, term: string, applyValue: (value: string) => void): string {
    return this.consumeTerm(searchExpression, new RegExp(`\\b${term}:"([^"]*)"`, 'g'), applyValue);
  }

  private consumeFlag(searchExpression: string, flag: string, applyValue: () => void): string {
    return this.consumeTerm(searchExpression, new RegExp(`\\bflag:${flag}\\b`, 'g'), applyValue);
  }

  private consumeTerm(searchExpression: string, pattern: RegExp, applyValue: (value?: string) => void): string {
    return searchExpression.replace(pattern, (_match, value) => {
      applyValue(value);
      return ' ';
    });
  }

  private cleanDanglingAnd(searchExpression: string): string {
    const cleaned = searchExpression
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^(AND\s+)+/, '')
      .replace(/(\s+AND)+$/, '')
      .replace(/\s+AND\s+AND\s+/g, ' AND ')
      .trim();

    return /^(AND\s*)+$/.test(cleaned) ? '' : cleaned;
  }
}
