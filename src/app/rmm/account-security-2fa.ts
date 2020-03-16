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
import { of } from 'rxjs';
import { RMM } from '../rmm';

export class AccountSecurity2fa {
    public profiles: any;
    user_password: string;
    is_busy = false;
    settings: any = {};
    otp: any;
    new_totp_code: string = '';
    totp_label: string;
    qr_code_value: any;


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
            ['is_2fa_enabled','is_app_pass_enabled','is_device_2fa_enabled',].forEach( (attr) => {
                this.settings[attr] = this.settings[attr] ? true : false;
            } );
            if ( reply['status'] === 'error' ) {
                this.app.show_error( reply['error'].join( '' ), 'Dismiss' );
                return;
            }
            return;
          },
          error => {
            this.is_busy = false;
            return this.app.show_error('Could not load 2FA settings.', 'Dismiss');
          }
        );
        return req;
    }

    toggle_2fa() {
        const data = {
            action: 'update',
            is_enabled: this.settings.is_2fa_enabled,
            password: this.app.account_security.user_password,
        };
        this.update(data);
    }

    toggle_totp_device() {
        const data = {
            action: 'update_status',
            is_enabled: this.settings.is_device_2fa_enabled,
            password: this.app.account_security.user_password,
        };
        this.totp_update(data);
    }

    update(data): Observable<any> {
        this.is_busy = true;
        data = data || {
//  is_enabled: 1,
//  action: 'update',
//  password: xxxx
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
//                                  is_enabled : is_enabled,
//                                  action : 'update_status',
//                                  password : field_password.value,


// to update the verified secret:
//                                          secret : self.app.field['totp_code'].value,
//                                          device : self.app.field['totp_device-select'].value,
//                                          action : 'update_secret',

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
            return this.app.show_error('Could not load profiles.', 'Dismiss');
          }
        );
        return req;
    }

    totp_check(data): Observable<any> {
        this.is_busy = true;
        data = data || {
//                              password : field_password.value,
//                              code : code,
//                              secret : self.app.field['totp_code'].value,
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
            return this.app.show_error('Could not load profiles.', 'Dismiss');
          }
        );
        return req;
    }

    totp_regenerate(data){
        this.is_busy = true;
        this.new_totp_code = this.generate_totp_code();
        this.totp_label = "Runbox: " + this.app.me.data.username;
        const device = 'totp';
        const qr_code_url = new URL(window.location.protocol + "//" + window.location.hostname);
        qr_code_url.pathname = "/ajax/ajax_mfa_qr_code_generator";
        qr_code_url.searchParams.set("device", device);
        qr_code_url.searchParams.set("label", this.totp_label);
        qr_code_url.searchParams.set("secret", this.new_totp_code);
        let qr_code_image = this.generate_qr_code(device, this.app.account_security.tfa.totp_label, this.new_totp_code);
    }

    generate_totp_code() {
        let chars = [
            "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", 
            "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", 
            "2", "3", "4", "5", "6", "7"
        ];
        let codelen = 16;
        return this.random_string( chars, codelen );
    }

    random_string(chars, length) { //['a','b', 1, 3, 'Z'], 10
        let random_string = "";
        for ( let i=0; i < length ; i++ ) {
            const rnd = Math.random();
            const len = chars.length;
            const num = Math.floor(rnd * len);
            const chr = chars[ num ].toString();
            random_string += chr;
        }
        return random_string;
    }


    generate_qr_code( device_2fa, device_label, code ) {
        this.qr_code_value = new URL("otpauth://");
        this.qr_code_value.pathname = "//" + [device_2fa, encodeURI(device_label)].join("/")
        this.qr_code_value.searchParams.set('secret', encodeURI(code));
    }

    otp_upadte(data): Observable<any> {
        this.is_busy = true;
        data = data || {
//                          password : field_password.value,
//                          action : 'regenerate',

//                                  password : field_password.value,
//                                  action : 'update_status',
//                                  is_enabled : is_enabled,
        };
        const req = this.app.ua.http.put('/ajax/ajax_mfa_otp', data).pipe(timeout(60000), share());
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
            return this.app.show_error('Could not load profiles.', 'Dismiss');
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
// {total_available: 40, is_enabled:0}
            this.otp = reply;
            return;
          },
          error => {
            this.is_busy = false;
            return this.app.show_error('Could not load profiles.', 'Dismiss');
          }
        );
        return req;
    }


}
