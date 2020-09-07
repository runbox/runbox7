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

import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MultipleSearchFieldsInputComponent } from './multiple-search-fields-input.component';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { take } from 'rxjs/operators';

describe('MultipleSearchFieldsInputComponent', () => {
  let component: MultipleSearchFieldsInputComponent;
  let fixture: ComponentFixture<MultipleSearchFieldsInputComponent>;

  beforeEach(async(() => {
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

    const searchExpressionPromise = component.searchexpression.pipe(take(1)).toPromise();
    component.formGroup.get('subject').setValue('testsubject');

    const searchExpression = await searchExpressionPromise;
    console.log(searchExpression);
    expect(searchExpression).toBe('folder:"Testfolder" AND subject:"testsubject"');
  });
});
