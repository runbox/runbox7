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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { WelcomeDeskComponent } from './welcomedesk.component';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

describe('WelcomeDeskComponent', () => {
  let component: WelcomeDeskComponent;
  let fixture: ComponentFixture<WelcomeDeskComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WelcomeDeskComponent ],
      imports: [
      ],
      providers:
      [
        {
          provide: ActivatedRoute,
          useValue: {
              queryParams: of(convertToParamMap({offer: 'y'}))
          },
        },
        { provide: RunboxWebmailAPI, useValue: {
          me: of({first_name: 'Test', last_name: 'User'}),
        }, }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(WelcomeDeskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
