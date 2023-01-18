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

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { HttpClient } from '@angular/common/http';

import { RMMAuthGuardService } from '../rmmapi/rmmauthguard.service';
import { map, filter } from 'rxjs/operators';
import { ProgressService } from '../http/progress.service';

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'login',
    templateUrl: 'login.component.html',
    moduleId: 'angular2/app/login/'
})

export class LoginComponent implements OnInit {

    accountSuspended = false;
    accountExpiredTrial = false;
    accountExpiredSubscription = false;
    accountCanceled = false;
    accountClosed = false;
    accountError = false;

    twofactor: any = false;
    unlock_question: string;
    login_error_html: string;

    constructor(private httpclient: HttpClient,
        private router: Router,
        private authservice: RMMAuthGuardService,
        public progressService: ProgressService
    ) {

    }

    ngOnInit() {
        this.authservice.isLoggedIn()
            .pipe(filter(res => res === true))
            .subscribe(() => this.router.navigateByUrl('/'));
    }

    public onTwoFactorSubmit(theform) {
        this.twofactor.totpcode = undefined;
        this.twofactor.otpcode = undefined;
        this.twofactor.unlock_code = undefined;
        this.twofactor.unlock_answer = undefined;
        this.twofactor.trust_this_browser = undefined;
        this.login_errors_reset();

        if (theform.twofactormethod === 'totp') {
            this.twofactor.cmd = 'authtotp';
            this.twofactor.totpcode = theform.totp;
            this.twofactor.trust_this_browser = theform.trust_this_browser_totp ? 1 : 0;
        } else if (theform.twofactormethod === 'otp') {
            this.twofactor.cmd = 'authotp';
            this.twofactor.otpcode = theform.otp;
            this.twofactor.trust_this_browser = theform.trust_this_browser_otp ? 1 : 0;
        } else if (theform.twofactormethod === 'unlock_code') {
            this.twofactor.cmd = 'authunlockcode';
            this.twofactor.unlock_code = theform.unlock_code;
            this.twofactor.unlock_answer = theform.unlock_answer;
        }
        this.httpclient.post('/ajax_mfa_authenticate', this.twofactor).pipe(
            map((loginresonseobj: any) => {
                if (loginresonseobj.code === 200) {
                    this.handleLoginResponse(loginresonseobj, {});
                } else {
                    this.handleLoginError(loginresonseobj);
                }
            })).subscribe();
    }

    public onSubmit(loginform) {
        const loginBodyObj = { user: loginform.username, password: loginform.password };
        this.login_errors_reset();
        const login_checkboxes = ['is_use_rmm6', 'is_keep_logged'];
        login_checkboxes.forEach((v) => {
            if ( loginform[v] ) {
                loginBodyObj[v] = true;
            }
        });
        this.httpclient.post('/ajax_mfa_authenticate', loginBodyObj).subscribe(
            (loginresonseobj: any) => {
                if (loginresonseobj.code === 200) {
                    this.handleLoginResponse(loginresonseobj, loginBodyObj);
                } else if (loginresonseobj.is_2fa_enabled === '1') {
                    this.twofactor = loginBodyObj;
                    this.unlock_question = loginresonseobj.unlock_question;
                } else {
                    this.handleLoginError(loginresonseobj);
                }
            },
            err => {
                return this.handleLoginError(err);
            }
        );
    }

    private handleLoginError(loginresonseobj: any) {
        const error_msgs_1fa = {
            429: `
            Error: Too many failed logins. You have entered the wrong login details too many times.
            <br />
            Please use your unlock code to log in, or contact Runbox Support at support@runbox.com.
            `,
            430: `
            Error: Excessive failed logins - You have entered wrong login details excessively.
            <br />
            For security reasons you have been temporarily banned from logging in.
            Try again later, or contact Runbox Support at support@runbox.com.
            `,
            500: `
            Error: 500 - Authentication server error. Please contact Runbox Support at support@runbox.com.
            `,
        };
        if (!loginresonseobj.is_2fa_enabled && loginresonseobj.code && error_msgs_1fa[loginresonseobj.code]) {
            this.login_error_html = '<p>' + error_msgs_1fa[loginresonseobj.code] + '</p>';
        }
        if (loginresonseobj.user_status === '1') {
            this.accountSuspended = true;
        } else if (loginresonseobj.user_status === '2') {
            this.accountExpiredTrial = true;
        } else if (loginresonseobj.user_status === '3') {
            this.accountExpiredTrial = true;
        } else if (loginresonseobj.user_status === '4') {
            this.accountExpiredSubscription = true;
        } else if (loginresonseobj.user_status === '5') {
            this.accountCanceled = true;
        } else if (loginresonseobj.user_status > 5) {
            this.accountClosed = true;
        } else if (loginresonseobj.error) {
            this.login_error_html = '<p>' + (loginresonseobj.error || 'Error occurred') + '</p>';
        } else {
            this.accountError = true;
        }
    }

    private handleLoginResponse(loginresonseobj: any, loginreq: any) {
        if (loginresonseobj.user_status > 0 && loginresonseobj.user_status < 5) {
            this.handleLoginError(loginresonseobj);
        } else {
            if (loginreq.is_use_rmm6) {
                window.location.href = '/mail';
                return;
            }
            this.router.navigateByUrl(this.authservice.urlBeforeLogin);
        }
    }

    private login_errors_reset() {
        this.login_error_html = undefined;
    }
}
