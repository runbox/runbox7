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

import { TestBed, async } from '@angular/core/testing';
import { ContactsAppComponent } from './contacts-app.component';
import { ContactsAppModule } from './contacts-app.module';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Observable } from 'rxjs';
import { LocationStrategy, APP_BASE_HREF } from '@angular/common';

describe('ContactsAppComponent', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        ContactsAppModule,
        RouterTestingModule.withRoutes([])
      ],
      providers: [
        { provide: RunboxWebmailAPI, useValue: {
            syncContacts: (_): Observable<any> => of({added: []}) }
        }
      ]
    }).compileComponents();
  }));
});
