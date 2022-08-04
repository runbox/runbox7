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
import { timeout, share } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { RMM } from '../rmm';
import * as OTPAuth from 'otpauth';

export class AccountSecurity2fa {
    user_password: string;
    is_busy = false;
    settings: any = {};
    otp: any;
    new_totp_code = '';
    totp_label: string;
    qr_code_value: any;
    otp_generated_list: any;


    constructor(
        public app: RMM,
    ) {
    }

    get(): Observable<any> {
        this.is_busy = true;
        const data = {
        };
        const req = this.app.ua.http.get('/ajax/ajax_mfa_2fa', data).pipe(timeout(60000), share());
        req.subscribe(
          reply => {
            this.is_busy = false;
            this.settings = reply['mfa_2fa'][0];
            [
                'is_otp_enabled',
                'is_2fa_enabled',
                'is_app_pass_enabled',
                'is_device_2fa_enabled',
                'is_overwrite_subaccount_ip_rules',
            ].forEach( (attr) => {
                this.settings[attr] = this.settings[attr] ? true : false;
            } );
            if ( reply['status'] === 'error' ) {
                this.app.show_error( reply['error'].join( '' ), 'Dismiss' );
                return;
            }
            // this.totp_label = 'Runbox' + this.app.me.data.username;
            return;
          },
          error => {
            this.is_busy = false;
            return this.app.show_error('Could not load 2FA settings.', 'Dismiss');
          }
        );
        return req;
    }

    update(data): Observable<any> {
        this.is_busy = true;
        data = data || {
        };
        const req = this.app.ua.http.put('/ajax/ajax_mfa_2fa', data).pipe(timeout(60000), share());
        req.subscribe(
          reply => {
            this.is_busy = false;
            if ( reply['status'] === 'error' ) {
                this.app.show_error( reply['error'].join( '' ), 'Dismiss' );
                return;
            }
            this.get();
            return;
          },
          error => {
            this.is_busy = false;
            return this.app.show_error('Could not update 2FA settings.', 'Dismiss');
          }
        );
        return req;
    }

    totp_update(data): Observable<any> {
        this.is_busy = true;
        data = data || {
        };
        const req = this.app.ua.http.put('/ajax/ajax_mfa_totp', data).pipe(timeout(60000), share());
        req.subscribe(
          reply => {
            this.is_busy = false;
            if ( reply['status'] === 'error' ) {
                this.app.show_error( reply['error'].join( '' ), 'Dismiss' );
                return;
            }
            this.get();
            return;
          },
          error => {
            this.is_busy = false;
            return this.app.show_error('Could not update TOTP.', 'Dismiss');
          }
        );
        return req;
    }

    totp_check(data): Observable<any> {
        this.is_busy = true;
        data = data || {
        };
        const req = this.app.ua.http.post('/ajax/ajax_mfa_totp_check', data).pipe(timeout(60000), share());
        req.subscribe(
          reply => {
            this.is_busy = false;
            if ( reply['status'] === 'error' ) {
                this.app.show_error( reply['error'].join( '' ), 'Dismiss' );
                return;
            }
            return;
          },
          error => {
            this.is_busy = false;
            return this.app.show_error('Could not check TOTP.', 'Dismiss');
          }
        );
        return req;
    }

    totp_regenerate(data) {
        this.is_busy = true;
        this.new_totp_code = this.generate_totp_code();
        this.totp_label = this.app.me.data.username;
        const otpa = new OTPAuth.TOTP({
            issuer: 'Runbox',
            label: this.totp_label,
            secret: this.new_totp_code
        });
        this.qr_code_value = new URL(otpa.toString());
    }

    generate_totp_code() {
        const chars = [
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
            'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
            '2', '3', '4', '5', '6', '7'
        ];
        const codelen = 16;
        return this.random_string( chars, codelen );
    }

    random_string(chars, length) { // ['a','b', 1, 3, 'Z'], 10
        let random_string = '';
        const array = new Uint8Array(16);
        window.crypto.getRandomValues(array);
        const charslen = chars.length;
        for ( let i = 0; i < length ; i++ ) {
            const rnd = array[i];
            const num = Math.floor(rnd % charslen);
            const chr = chars[ num ].toString();
            random_string += chr;
        }
        return random_string;
    }

    otp_update(data): Observable<any> {
        this.is_busy = true;
        data = data || {
        };
        const req = this.app.ua.http.put('/ajax/ajax_mfa_otp', data).pipe(timeout(60000), share());
        req.subscribe(
          reply => {
            this.is_busy = false;
            if ( reply['status'] === 'error' ) {
                this.app.show_error( reply['error'].join( '' ), 'Dismiss' );
                return;
            }
            this.otp_generated_list = reply;
            return;
          },
          error => {
            this.is_busy = false;
            return this.app.show_error('Could not update OTP.', 'Dismiss');
          }
        );
        return req;
    }

    otp_list(): Observable<any> {
        this.is_busy = true;
        const data = {
        };
        const req = this.app.ua.http.get('/ajax/ajax_mfa_otp', data).pipe(timeout(60000), share());
        req.subscribe(
          reply => {
            this.is_busy = false;
            if ( reply['status'] === 'error' ) {
                this.app.show_error( reply['error'].join( '' ), 'Dismiss' );
                return;
            }
            this.otp = reply;
            return;
          },
          error => {
            this.is_busy = false;
            return this.app.show_error('Could not list OTP.', 'Dismiss');
          }
        );
        return req;
    }


}
