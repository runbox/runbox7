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
import { Injectable } from '@angular/core';
import { UserAgent } from './rmm/useragent';
import { HttpClient } from '@angular/common/http';
import { Email } from './rmm/email';
import { Profile } from './rmm/profile';
import { Alias } from './rmm/alias';
import { Me } from './rmm/me';
import { RunboxDomain } from './rmm/runbox_domain';
import { AccountSecurity } from './rmm/account-security';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { AccountStorage } from './rmm/account-storage';
import { AccountSettings } from './rmm/account-settings';

export { AllIdentities, Identity } from './rmm/profile';

@Injectable({
    providedIn: 'root',
})

export class RMM {
    public ua: UserAgent;
    public profile: Profile;
    public alias: Alias;
    public me: Me;
    public email: Email;
    public runbox_domain: RunboxDomain;
    public account_security: AccountSecurity;
    public account_storage: AccountStorage;
    public account_settings: AccountSettings;
    constructor(
        public http: HttpClient,
        public snackBar: MatSnackBar,
    ) {
        this.ua = new UserAgent(this, this.http);
        this.profile = new Profile(this);
        this.alias = new Alias(this);
        this.me = new Me(this);
        this.runbox_domain = new RunboxDomain(this);
        this.email = new Email(this);
        this.account_security = new AccountSecurity(this);
        this.account_storage = new AccountStorage(this);
        this.account_settings = new AccountSettings(this);
    }

    public show_error ( message, action ) {
        this.snackBar.open(message, action, {
            duration: 2000,
        });
    }

    public handle_errors ( res ) {
        if ( res.status === 'error' ) {
            if ( res.errors ) {
                this.show_error( res.errors.join( '' ), 'Dismiss' );
            }
        }
    }

    public handle_field_errors ( res, field_errors ) {
        if ( res.status === 'error' ) {
            if ( field_errors && res.field_errors ) {
                field_errors = res.field_errors;
            }
            if ( res.errors ) {
                this.show_error( res.errors.join( '' ), 'Dismiss' );
            }
        }
    }
}
