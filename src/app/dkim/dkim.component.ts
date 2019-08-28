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
/*
       list domains: GET    /rest/v1/email_hosting/domains
          list keys: GET    /rest/v1/dkim/$domain/keys
create initial keys: POST   /rest/v1/dkim/$domain/keys/create
        replace key: PUT    /rest/v1/dkim/$domain/key/update/$selector -- or selector2
         delete key: DELETE /rest/v1/dkim/$domain/key/remove/$selector -- or selector2
*/
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
  selector: 'app-dkim',
  templateUrl: 'dkim.component.html'
})

export class DkimComponent implements AfterViewInit {
  panelOpenState = false;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  @Output() Close: EventEmitter<string> = new EventEmitter();
  domain;
  keys = [];
  key_active;
  is_rotating = 0;

  ngAfterViewInit() {
  }
  constructor(
    private http: Http,
    public snackBar: MatSnackBar,
  ) {
    const domain = window.location.href.match(/domain=([^&]+)/);
    if (domain && domain[1]) {
      this.domain = domain[1];
      this.load_keys();
    }
  }

  load_keys () {
    const get_keys = this.http.get('/rest/v1/dkim/' + this.domain + '/keys');
    get_keys.pipe(timeout(180000));
    get_keys.subscribe(
      result => {
        const r = result.json();
        if ( r.status === 'success' ) {
          this.keys = r.result.keys;
          this.is_rotating = r.result.domain.is_rotating;
          this.set_active_key(this.keys);
        } else if ( r.status === 'error' ) {
          return this.show_error( r.errors.join('\n'), 'Dismiss' );
        } else {
          return this.show_error( 'Unknown error has happened.', 'Dismiss' );
        }
      },
      error => {
        return this.show_error('Could not list dkim keys.', 'Dismiss');
      }
    );
  }

  set_active_key (keys) {
    const active = keys.filter( (k) => k.is_active );
    if ( active.length ) {
      this.key_active = active[0];
    }
  }

  create_keys () {
    const req = this.http.post('/rest/v1/dkim/' + this.domain + '/keys/create', {});
    req.pipe(timeout(18000));
    req.subscribe(
      result => {
        const r = result.json();
        if ( r.status === 'success' ) {
          this.keys = r.result.keys;
          this.load_keys();
        } else if ( r.status === 'error' ) {
          return this.show_error( r.errors.join('\n'), 'Dismiss' );
        } else {
          return this.show_error( 'Unknown error has happened.', 'Dismiss' );
        }
      },
      error => {
        return this.show_error('Could not create dkim keys', 'Dismiss');
      }
    );
  }

  get_status (item) {
    if ( !item.is_active && this.is_rotating ) {
        return 'Rotating';
    } else if ( item.is_active ) {
        return 'Active';
    } else {
        return 'Inactive';
    }
  }

  check_cname (item) {
    const url = '/rest/v1/dkim/' + this.domain + '/check_cname/' + item.selector;
    const req = this.http.put(url, {});
    req.pipe(timeout(18000));
    req.subscribe(
      result => {
        const r = result.json();
        if ( r.status === 'success' ) {
          this.load_keys();
        } else if ( r.status === 'error' ) {
          return this.show_error( r.errors.join('\n'), 'Dismiss' );
        } else {
          return this.show_error( 'Unknown error has happened.', 'Dismiss' );
        }
      },
      error => {
        return this.show_error('There was an error.', 'Dismiss');
      }
    );
  }

  reconfigure (item) {
    const url = '/rest/v1/dkim/' + this.domain + '/reconfigure/' + item.selector;
    const req = this.http.put(url, {});
    req.pipe(timeout(18000));
    req.subscribe(
      result => {
        const r = result.json();
        if ( r.status === 'success' ) {
          this.load_keys();
        } else if ( r.status === 'error' ) {
          return this.show_error( r.errors.join('\n'), 'Dismiss' );
        } else {
          return this.show_error( 'Unknown error has happened.', 'Dismiss' );
        }
      },
      error => {
        return this.show_error('There was an error.', 'Dismiss');
      }
    );
  }

  show_error (message, action) {
    this.snackBar.open(message, action, {
      duration: 2000,
    });
  }
}
