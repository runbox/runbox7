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

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MultipleSearchFieldsInputComponent } from './multiple-search-fields-input.component';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { firstValueFrom } from 'rxjs';
import { SimpleChange } from '@angular/core';

describe('MultipleSearchFieldsInputComponent', () => {
  let component: MultipleSearchFieldsInputComponent;
  let fixture: ComponentFixture<MultipleSearchFieldsInputComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ CommonModule,
        NoopAnimationsModule,
        ReactiveFormsModule,
        MatIconModule,
        MatIconTestingModule,
        MatButtonModule,
        MatInputModule,
        MatCheckboxModule ],
        declarations: [ MultipleSearchFieldsInputComponent, MatIcon ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MultipleSearchFieldsInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should search in selected folder',  async () => {
    component.currentFolder = 'Testfolder';
    component.formGroup.get('currentfolderonly').setValue(true);

    const searchExpressionPromise = firstValueFrom(component.searchexpression);
    component.formGroup.get('subject').setValue('testsubject');

    const searchExpression = await searchExpressionPromise;
    console.log(searchExpression);
    expect(searchExpression).toBe('folder:"Testfolder" AND subject:"testsubject"');
  });

  it('should update fields from a generated search expression', () => {
    component.currentFolder = 'Inbox';
    (component as any).searchExpression = 'folder:"Inbox" AND from:"from@example.com" AND to:"to@example.com" AND subject:"Quarterly report" AND (budget) AND flag:attachment AND flag:answered AND flag:flagged AND date:202606 AND NOT flag:seen';

    (component as any).ngOnChanges({
      searchExpression: new SimpleChange('', (component as any).searchExpression, false)
    });

    expect(component.formGroup.get('currentfolderonly').value).toBeTrue();
    expect(component.formGroup.get('from').value).toBe('from@example.com');
    expect(component.formGroup.get('to').value).toBe('to@example.com');
    expect(component.formGroup.get('subject').value).toBe('Quarterly report');
    expect(component.formGroup.get('allfieldsandcontent').value).toBe('budget');
    expect(component.formGroup.get('hasAttachment').value).toBeTrue();
    expect(component.formGroup.get('hasReply').value).toBeTrue();
    expect(component.formGroup.get('hasFlag').value).toBeTrue();
    expect(component.formGroup.get('date').value).toBe('202606');
    expect(component.formGroup.get('unreadOnly').value).toBeTrue();
  });

  it('should show unstructured query text in the all fields input', () => {
    (component as any).searchExpression = 'monthly budget';

    (component as any).ngOnChanges({
      searchExpression: new SimpleChange('', (component as any).searchExpression, false)
    });

    expect(component.formGroup.get('allfieldsandcontent').value).toBe('monthly budget');
  });
});
