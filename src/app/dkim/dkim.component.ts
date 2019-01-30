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

import { timeout } from 'rxjs/operators';
import { SecurityContext, Component, Input, Output, EventEmitter, NgZone, ViewChild, AfterViewInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Http, URLSearchParams, ResponseContentType, Headers } from '@angular/http';
import { Router } from '@angular/router';
import { ProgressService } from '../http/progress.service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpModule, JsonpModule, XHRBackend, RequestOptions, BrowserXhr } from '@angular/http';
import {
  MatCardModule,
  MatCheckboxModule,
  MatDialogModule,
  MatInputModule,
  MatListModule,
  MatPaginatorModule,
  MatProgressBarModule,
  MatProgressSpinnerModule,
  MatSelectModule,
  MatSnackBarModule,
  MatTableModule,
  MatTabsModule,
  MatChipsModule,
  MatDialog,
  MatPaginator,
  MatSnackBar,
  MatTableDataSource,
} from '@angular/material';

@Component({
  moduleId: 'angular2/app/dkim/',
  selector: 'dkim',
  templateUrl: 'dkim.component.html'
})

export class DkimComponent implements AfterViewInit {
  @ViewChild(MatPaginator) paginator: MatPaginator;

  @Output() onClose: EventEmitter<string> = new EventEmitter();
  public relativeTop = '50%';
  public selected_product;
  public selected_privacy_product;
  public allows_whois_privacy = false;
  ngAfterViewInit() {
  }
  constructor(
    private http: Http,
    public snackBar: MatSnackBar,
  ) {
  let domain = window.location.href.match(/domain=([^&]+)/);
  alert('DKIM for domain: ' + domain);
  }
}
