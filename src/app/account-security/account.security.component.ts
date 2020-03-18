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
import { SecurityContext, Component, Input, Output, EventEmitter, NgZone, ViewChild, AfterViewInit, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { ProgressService } from '../http/progress.service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatPaginator } from '@angular/material/paginator';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';

import { RunboxIntroComponent } from '../runbox-components/runbox-intro';
import { RunboxListComponent } from '../runbox-components/runbox-list';
import { RunboxContainerComponent } from '../runbox-components/runbox-container';
import { RunboxSectionComponent } from '../runbox-components/runbox-section';
import { RunboxSlideToggleComponent } from '../runbox-components/runbox-slide-toggle';
import { RunboxTimerComponent } from '../runbox-components/runbox-timer';
import { MatFormFieldModule } from '@angular/material/form-field';
import { RMM } from '../rmm';

@Component({
  moduleId: 'angular2/app/account-security/',
  selector: 'app-account-security',
  templateUrl: 'account.security.component.html'
})

export class AccountSecurityComponent implements OnInit {
  panelOpenState = false;
  @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;
  @Output() Close: EventEmitter<string> = new EventEmitter();
  dialog_ref: any;
  totp_test_code: any;
  is_btn_totp_check_disabled = true;
  is_btn_trust_browser_disabled = true;
  trusted_browser_name: string;
  app_pass_name: string;
  is_btn_app_pass_new_disabled = false;
  acl_service = '';
  acl_status = '';
  acl_period = '1h';
  acl_filter_ips = '';
  acl_ip = '';
  acl_overwrite_subaccount_rules = '0';
  is_acl_clear_enabled = false;
  acl_manage_ip_rule = 'deny';
  acl_manage_ip_range = '';
  acl_manage_ip_label = '';
  is_busy_list_logins = false;
  is_busy_otp_update = false;
  is_busy_unlock_code_update = false;

  constructor(
    public snackBar: MatSnackBar,
    public dialog: MatDialog,
    public rmm: RMM,
  ) {
    this.rmm.me.load();
  }

  otp_generate() {
    this.is_busy_otp_update = true;
    this.rmm.account_security.tfa.otp_upadte({
        action: 'regenerate',
        password: this.rmm.account_security.user_password,
    }).subscribe( (res) => {
        this.is_busy_otp_update = false;
        if ( res.status === 'error' ) {
            this.show_error( ( res.error || res.errors.join(' ') ), 'Dismiss' );
        }
    });
  }

  totp_generate_new_key() {
    // creates a new key
    this.rmm.account_security.tfa.totp_regenerate({});
  }

  totp_test_code_change() {
      // enable this.is_btn_totp_check_disabled
      if ( this.totp_test_code && this.totp_test_code.length === 6) {
          this.is_btn_totp_check_disabled = false;
      } else {
          this.is_btn_totp_check_disabled = true;
      }
  }

  totp_check_code() {
      this.rmm.account_security.tfa.totp_check({
          password: this.rmm.account_security.user_password,
          code: this.totp_test_code,
          secret: this.rmm.account_security.tfa.new_totp_code,
      }).subscribe((res) => {
        if ( res.status === 'success' ) {
            this.show_error( 'Your code is correct!', 'Dismiss' );
            this.rmm.account_security.tfa.totp_update({
                password: this.rmm.account_security.user_password,
                device: 'totp',
                action: 'update_secret',
                secret: this.rmm.account_security.tfa.new_totp_code,
            });
        } else if ( res.status === 'fail' ) {
            this.show_error('Could not validate code. Verify and try again.', 'Dismiss');
        } else {
            if ( res.status === 'error' ) {
                this.show_error( ( res.error || res.errors.join(' ') ), 'Dismiss' );
            }
        }
      });
  }

  trusted_browser_name_change() {
    if ( this.trusted_browser_name ) {
        this.is_btn_trust_browser_disabled = false;
    } else {
        this.is_btn_trust_browser_disabled = true;
    }
  }

  device_trust_create() {
    this.rmm.account_security.device.update({
        name: this.trusted_browser_name,
        action: 'trust_device',
        password: this.rmm.account_security.user_password,
    }).subscribe( (res) => {
        if ( res.status === 'error' ) {
            this.show_error( ( res.error || res.errors.join(' ') ), 'Dismiss' );
        }
    });
  }

  device_delete(id) {
    this.rmm.account_security.device.update({
        password: this.rmm.account_security.user_password,
        action: 'delete_device',
        id: id,
    }).subscribe( ( res ) => {
        if ( res.status === 'error' ) {
            this.show_error( ( res.error || res.errors.join(' ') ), 'Dismiss' );
        }
    });
  }

  device_toggle(result) {
    this.rmm.account_security.device.update({
        password: this.rmm.account_security.user_password,
        action: 'update_status',
        is_enabled: result.is_trusted ? 1 : 0,
        id: result.id,
    }).subscribe( (res) => {
        if ( res.status === 'error' ) {
            this.show_error( ( res.error || res.errors.join(' ') ), 'Dismiss' );
        }
    } );
  }

  unlock_code_generate() {
    this.is_busy_unlock_code_update = true;
    this.rmm.account_security.unlock_code.generate({
        action: 'generate',
        password: this.rmm.account_security.user_password,
    }).subscribe( ( res ) => {
        this.is_busy_unlock_code_update = false;
        if ( res.status === 'error' ) {
            this.show_error( ( res.error || res.errors.join(' ') ), 'Dismiss' );
        }
    });
  }

  service_toggle(result) {
  console.log('change service:', result);
    if ( result.id ) {
        this.rmm.account_security.service.update({
            services: [{
                id: result.id,
                is_enabled: result.is_enabled,
                service: result.service,
            }],
            password: this.rmm.account_security.user_password,
        }).subscribe( (res) => {
            this.rmm.account_security.service.list();
            if ( res.status === 'error' ) {
                this.show_error( ( res.error || res.errors.join(' ') ), 'Dismiss' );
            }
        });
    } else {
        this.rmm.account_security.service.create({
            services: [{
                is_enabled: result.is_enabled,
                service: result.service,
            }],
            password: this.rmm.account_security.user_password,
        }).subscribe( ( res ) => {
            this.rmm.account_security.service.list();
            if ( res.status === 'error' ) {
                this.show_error( ( res.error || res.errors.join(' ') ), 'Dismiss' );
            }
        });
    }
  }

  app_pass_create() {
    this.rmm.account_security.app_pass.create({
        name: this.app_pass_name,
        password: this.rmm.account_security.user_password,
    }).subscribe( ( res ) => {
        if ( res.status === 'error' ) {
            this.show_error( ( res.error || res.errors.join(' ') ), 'Dismiss' );
        }
    });
  }

  app_pass_name_changed() {
    if (this.app_pass_name) {
        this.is_btn_app_pass_new_disabled = false;
    } else {
        this.is_btn_app_pass_new_disabled = true;
    }
  }

  app_pass_delete(result) {
    this.rmm.account_security.app_pass.update({
        action: 'delete',
        id: result.id,
        password: this.rmm.account_security.user_password,
    }).subscribe( ( res ) => {
        if ( res.status === 'error' ) {
            this.show_error( ( res.error || res.errors.join(' ') ), 'Dismiss' );
        }
    });
  }

  app_pass_toggle(result) {
    this.rmm.account_security.app_pass.update({
        is_enabled: result.is_enabled,
        action: 'update_pass_status',
        id: result.id,
        password: this.rmm.account_security.user_password,
    }).subscribe( ( res ) => {
        if ( res.status === 'error' ) {
            this.show_error( ( res.error || res.errors.join(' ') ), 'Dismiss' );
        }
    });
  }

  acl_clear() {
    this.acl_ip = '';
  }

  acl_update() {
    this.is_busy_list_logins = true;
    const query = {};
    query['period'] = this.acl_period;
    query['service'] = this.acl_service;
    query['status'] = this.acl_status;
    if ( this.acl_filter_ips ) {
        query['ips_filter'] = this.acl_filter_ips.split(',');
    }
    this.rmm.account_security.acl.logins_list(query)
        .subscribe( (res) => {
            if ( res.status === 'error' ) {
                this.show_error( ( res.error || res.errors.join(' ') ), 'Dismiss' );
            }
            this.is_busy_list_logins = false;
        });
  }

  acl_save() {
    this.rmm.account_security.acl.update_sub_account({
        is_overwrite_subaccount_ip_rules: this.acl_overwrite_subaccount_rules,
        password: this.rmm.account_security.user_password,
    }).subscribe(( res ) => {
        if ( res.status === 'success' ) {
            this.rmm.account_security.acl.accounts_affected();
        } else {
            if ( res.status === 'error' ) {
                this.show_error( ( res.error || res.errors.join(' ') ), 'Dismiss' );
            }
        }
    });
  }

  acl_remove_rule(result) {
    this.rmm.account_security.acl.remove_rule({
        id: result.id,
        password: this.rmm.account_security.user_password,
    }).subscribe( ( res ) => {
        if ( res.status === 'error' ) {
            this.show_error( ( res.error || res.errors.join(' ') ), 'Dismiss' );
        }
        this.rmm.account_security.acl.list({});
    });
  }

  acl_create_rule() {
    this.rmm.account_security.acl.create_rule({
        password: this.rmm.account_security.user_password,
        ip: this.acl_manage_ip_range,
        label: this.acl_manage_ip_label,
        rule: this.acl_manage_ip_rule,
    }).subscribe((res) => {
        if ( res.status === 'success' ) {
            this.rmm.account_security.acl.list({});
        }
    });
  }

  acl_ip_changed() {
    if ( this.acl_ip && this.acl_ip.length ) {
      this.is_acl_clear_enabled = true;
    } else {
      this.is_acl_clear_enabled = false;
    }
  }

  ip_unblock(result) {
    this.rmm.account_security.acl.unblock({
      ip: result.ip,
      password: this.rmm.account_security.user_password,
    }).subscribe( ( res ) => {
        if ( res.status === 'error' ) {
            this.show_error( ( res.error || res.errors.join(' ') ), 'Dismiss' );
        }
    });
  }

  ip_always_block(result) {
    const req = this.rmm.account_security.acl.update({
      ip: result.ip,
      label: 'Always Block',
      rule: 'deny',
      password: this.rmm.account_security.user_password,
    }).subscribe( ( res ) => {
        if ( res.status === 'error' ) {
            this.show_error( ( res.error || res.errors.join(' ') ), 'Dismiss' );
        }
        this.rmm.account_security.acl.logins_list({});
        this.rmm.account_security.acl.blocked_list();
    });
  }

  ip_never_block(result) {
    this.rmm.account_security.acl.update({
      ip: result.ip,
      rule: 'allow',
      password: this.rmm.account_security.user_password,
    }).subscribe( ( res ) => {
        if ( res.status === 'error' ) {
            this.show_error( ( res.error || res.errors.join(' ') ), 'Dismiss' );
        }
    });
  }

  list_services() {
    this.rmm.account_security.service.list().subscribe( (results) => {

    });
  }

  ngOnInit() {
    this.rmm.account_security.tfa.get();
    this.rmm.account_security.device.list();
    this.rmm.account_security.unlock_code.get();
    this.rmm.account_security.session.list();
    this.rmm.account_security.app_pass.list();
    this.rmm.account_security.acl.logins_list({});
    this.rmm.account_security.acl.blocked_list();
    this.rmm.account_security.acl.accounts_affected();
    this.rmm.account_security.acl.list({});
    this.list_services();
  }

  show_error (message, action) {
    this.snackBar.open(message, action, {
      duration: 2000,
    });
  }

  selectedTabIndexChange () {}

}
