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

import { Subject, Observable } from 'rxjs';
import { RMMAuthGuardService } from '../rmmapi/rmmauthguard.service';
import { map, filter } from 'rxjs/operators';
import { ProgressService } from '../http/progress.service';

@Component({
    // tslint:disable-next-line:component-selector
    selector: 'login',
    templateUrl: 'login.component.html',
    moduleId: 'angular2/app/login/'
})
export class LoginComponent implements OnInit {

    accountexpired = false;
    loginerrormessage: string;
    twofactor: any = false;
    twofactorerror: string;
    unlock_question: string;

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
                    this.handleLoginResponse(loginresonseobj);
                } else {
                    this.twofactorerror = loginresonseobj.error;
                }
            })).subscribe();
    }

    public onSubmit(loginform) {
        const loginBodyObj = { user: loginform.username, password: loginform.password };
        this.httpclient.post('/ajax_mfa_authenticate', loginBodyObj).pipe(
            map((loginresonseobj: any) => {
                if (loginresonseobj.code === 200) {
                    this.handleLoginResponse(loginresonseobj);
                } else if (loginresonseobj.is_2fa_enabled === '1') {
                    this.twofactorerror = null;
                    this.loginerrormessage = null;
                    this.twofactor = loginBodyObj;
                    this.unlock_question = loginresonseobj.unlock_question;
                } else {
                    this.loginerrormessage = loginresonseobj.message + ': ' + loginresonseobj.error;
                }
            })).subscribe();
    }

    private handleLoginResponse(loginresonseobj: any) {
        if (loginresonseobj.user_status > 0 && loginresonseobj.user_status < 5) {
            this.accountexpired = true;
            this.loginerrormessage = null;
        } else {
            this.accountexpired = false;
            this.loginerrormessage = null;
            this.router.navigateByUrl(this.authservice.urlBeforeLogin);
        }
    }
}
