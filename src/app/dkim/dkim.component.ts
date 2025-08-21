// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2025 Runbox Solutions AS (runbox.com).
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
import { Component, Output, EventEmitter, ViewChild, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfirmDialog } from '../dialog/dialog.module';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MatLegacyPaginator as MatPaginator } from '@angular/material/legacy-paginator';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { Router, ActivatedRoute } from '@angular/router';
import { DomainService, Domain, DomainKey } from './domain.service';

@Component({
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

export class DkimComponent implements OnInit {
  panelOpenState = false;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  @Output() Close: EventEmitter<string> = new EventEmitter();

  dkim_domain;
  dkim_domains = [];
  chosenDomain: string;
  is_creating_keys = false;
  is_rotating = 0;
  key = {};
  keys = [];
  is_deleting_keys = false;

  constructor(
    private dialog: MatDialog,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router,
    public domainService: DomainService,
  ) {
  }

  ngOnInit(): void {
    this.route.fragment.subscribe(
      fragment => {
        if (fragment !== this.chosenDomain) {
          this.chosenDomain = fragment;
          console.log(`scrolling to ${this.chosenDomain}`);
          const el = document.getElementById(`panel-${this.chosenDomain}`);
          el.scrollIntoView();
        }
      }
    );
  }

  updateFragment(domainName: string) {
    if(domainName !== this.chosenDomain) {
      this.chosenDomain = domainName;
      this.router.navigate(['/dkim'], { fragment: domainName });
    }
  }

  disable (domain: string) {
    const del_dkim_domain = this.http.delete('/rest/v1/dkim/domain/' + domain);
    const confirmDialog = this.dialog.open(ConfirmDialog);
    confirmDialog.componentInstance.title = `Delete dkim for domain ${domain}?`;
    confirmDialog.componentInstance.question =
        `Are you sure that you want to delete DKIM settings for domain ${domain}?`;
    confirmDialog.componentInstance.noOptionTitle = 'cancel';
    confirmDialog.componentInstance.yesOptionTitle = 'ok';
    confirmDialog.afterClosed().subscribe(result => {
      if ( result ) {
        this.is_deleting_keys = true;
        del_dkim_domain.subscribe(
          (r: any) => {
            this.is_deleting_keys = false;
            if ( r.status === 'success' ) {
              this.domainService.refresh();
              return this.show_snackbar( 'Settings will be deleted shortly. Please check in a few minutes!', 'Dismiss' );
            } else if ( r.status === 'error' ) {
              return this.show_snackbar( r.errors.join('\n'), 'Dismiss' );
            } else {
              return this.show_snackbar( 'Unknown error has happened.', 'Dismiss' );
            }
          },
          error => {
            this.is_deleting_keys = false;
            return this.show_snackbar('Could not list dkim domains list.', 'Dismiss');
          }
        );
      }
    });
  }


  create_keys () {
    this.is_creating_keys = true;
    const req = this.http.post('/rest/v1/dkim/' + this.chosenDomain + '/keys/create', {});
    req.subscribe(
      (r: any) => {
        if ( r.status === 'success' ) {
          this.is_creating_keys = false;
          this.keys = r.result.keys;
          this.domainService.refresh();
        } else if ( r.status === 'error' ) {
          this.is_creating_keys = false;
          return this.show_snackbar( r.errors.join('\n'), 'Dismiss' );
        } else {
          this.is_creating_keys = false;
          return this.show_snackbar( 'Unknown error has happened.', 'Dismiss' );
        }
      },
      error => {
        this.is_creating_keys = false;
        return this.show_snackbar('Could not create dkim keys', 'Dismiss');
      }
    );
  }

  check_cname (domain: Domain, key: DomainKey) {
    this.domainService.check_cname(domain.name, key).subscribe(
      res => this.show_snackbar(res ? 'CNAME is correct' : 'CNAME not found', 'Dismiss')
    );
  }

  show_snackbar (message, action) {
    this.snackBar.open(message, action, {
      duration: 2000,
    });
  }



}
