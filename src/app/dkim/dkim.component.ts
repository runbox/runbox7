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
import { Component, Output, EventEmitter, ViewChild, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfirmDialog } from '../dialog/dialog.module';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MatLegacyPaginator as MatPaginator } from '@angular/material/legacy-paginator';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';

@Component({
  moduleId: 'angular2/app/dkim/',
  selector: 'app-dkim',
  templateUrl: 'dkim.component.html',
  styles: [`
    .grid_align_left {
        margin-right: 10px; margin-left: 10px;
        text-align: left;
        width: 100%;
    }
    .grid_align_right {
        margin-right: 10px; margin-left: 10px;
        text-align: right;
        border-right: 1px solid #ededed;
        border-bottom: 1px solid #ededed;
        padding-right: 10px;
        width: 100%;
    }
    .terminal {
        background: #000;
        color: #FFF;
        padding: 25px 10px 10px 10px;
    }
  `],
})

export class DkimComponent implements AfterViewInit {
  panelOpenState = false;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  @Output() Close: EventEmitter<string> = new EventEmitter();

  dkim_domain;
  dkim_domains = [];
  domain;
  is_creating_keys = false;
  is_rotating = 0;
  key = {};
  keys = [];
  is_deleting_keys = false;

  ngAfterViewInit() {
  }

  disable () {
    const del_dkim_domain = this.http.delete('/rest/v1/dkim/domain/' + this.domain);
    const confirmDialog = this.dialog.open(ConfirmDialog);
    confirmDialog.componentInstance.title = `Delete dkim for domain ${this.domain}?`;
    confirmDialog.componentInstance.question =
        `Are you sure that you want to delete DKIM settings for domain ${this.domain}?`;
    confirmDialog.componentInstance.noOptionTitle = 'cancel';
    confirmDialog.componentInstance.yesOptionTitle = 'ok';
    confirmDialog.afterClosed().subscribe(result => {
      if ( result ) {
        this.is_deleting_keys = true;
        del_dkim_domain.subscribe(
          (r: any) => {
            this.is_deleting_keys = false;
            if ( r.status === 'success' ) {
              this.keys = [];
              this.key = {};
              this.load_dkim_domains();
              this.load_keys();
              return this.show_error( 'Settings will be deleted shortly. Please check in a few minutes!', 'Dismiss' );
            } else if ( r.status === 'error' ) {
              return this.show_error( r.errors.join('\n'), 'Dismiss' );
            } else {
              return this.show_error( 'Unknown error has happened.', 'Dismiss' );
            }
          },
          error => {
            this.is_deleting_keys = false;
            return this.show_error('Could not list dkim domains list.', 'Dismiss');
          }
        );
      }
    });
  }

  ev_get_domain () {
    this.load_dkim_domains();
    this.load_keys();
  }

  load_dkim_domains () {
   // const get_dkim_domains = this.http.get()
    const get_domains = this.http.get('/rest/v1/dkim/domains');
    get_domains.subscribe(
      (r: any) => {
        if ( r.status === 'success' ) {
          this.dkim_domains = r.result.domains;
          const filtered = this.dkim_domains.filter((o) => o.domain === this.domain);
          this.dkim_domain = filtered[0];
          if ( ! this.dkim_domain ) {
            return setTimeout(() => { this.load_dkim_domains(); }, 5000);
          }
          if ( !this.domain && this.dkim_domain ) {
            this.domain = this.dkim_domain.domain;
          }
        } else if ( r.status === 'error' ) {
          return this.show_error( r.errors.join('\n'), 'Dismiss' );
        } else {
          return this.show_error( 'Unknown error has happened.', 'Dismiss' );
        }
      },
      error => {
        return this.show_error('Could not list dkim domains list.', 'Dismiss');
      }
    );
  }

  load_keys () {
    if ( ! this.domain ) { return; }
    const get_keys = this.http.get('/rest/v1/dkim/' + this.domain + '/keys');
    get_keys.subscribe(
      (r: any) => {
        if ( r.status === 'success' ) {
          this.key = {};
          this.keys = r.result.keys;
          this.domain = r.result.domain.name;
          this.is_rotating = r.result.domain.is_rotating;
          this.keys.forEach( (k) => this.key[k.selector] = k );
        } else if ( r.status === 'error' ) {
          this.keys = [];
          return this.show_error( r.errors.join('\n'), 'Dismiss' );
        } else {
          return this.show_error( 'Unknown error has happened.', 'Dismiss' );
        }
      },
      error => {
      }
    );
  }

  create_keys () {
    this.is_creating_keys = true;
    const req = this.http.post('/rest/v1/dkim/' + this.domain + '/keys/create', {});
    req.subscribe(
      (r: any) => {
        if ( r.status === 'success' ) {
          this.is_creating_keys = false;
          this.keys = r.result.keys;
          this.load_dkim_domains();
          this.load_keys();
        } else if ( r.status === 'error' ) {
          this.is_creating_keys = false;
          return this.show_error( r.errors.join('\n'), 'Dismiss' );
        } else {
          this.is_creating_keys = false;
          return this.show_error( 'Unknown error has happened.', 'Dismiss' );
        }
      },
      error => {
        this.is_creating_keys = false;
        return this.show_error('Could not create dkim keys', 'Dismiss');
      }
    );
  }

  check_cname (item) {
    const url = '/rest/v1/dkim/' + this.domain + '/check_cname/' + item.selector;
    const req = this.http.put(url, {});
    req.subscribe(
      (r: any) => {
        if ( r.status === 'success' ) {
          this.show_error( 'This CNAME will be checked shortly.', 'Dismiss');
          this.load_keys();
          this.load_dkim_domains();
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

  constructor(
    private dialog: MatDialog,
    private http: HttpClient,
    private snackBar: MatSnackBar,
  ) {
    const domain = window.location.href.match(/domain=([^&]+)/);
    if (domain && domain[1]) {
      this.domain = domain[1];
      this.load_dkim_domains();
      if ( this.domain ) {
        this.load_keys();
      }
    }
  }


}
