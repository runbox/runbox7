// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2020 Runbox Solutions AS (runbox.com).
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

import { Injectable, ErrorHandler, Injector } from '@angular/core';
import * as Sentry from '@sentry/browser';

import './sentry';
import { RMMAuthGuardService } from './rmmapi/rmmauthguard.service';
import { RunboxWebmailAPI } from './rmmapi/rbwebmail';

@Injectable()
export class SentryErrorHandler implements ErrorHandler {
    userDataSet = false;

    constructor(private injector: Injector) {
        // hack needed since angular modules instantiate ErrorHandlers before anything else
        setTimeout(() => this.setUserData(), 0);
    }

    // this is a bit overly complicated, because RunboxWebmailAPI will break
    // if it gets instantiated before the user is actually logged in
    async setUserData() {
        if (this.userDataSet) {
            return;
        }
        const authguard = this.injector.get(RMMAuthGuardService);
        const isLoggedIn = await authguard.isLoggedIn().toPromise();
        if (isLoggedIn) {
            const rmmapi = this.injector.get(RunboxWebmailAPI);
            const me = await rmmapi.me.toPromise();
            Sentry.setUser({
                uid:      me.uid,
                username: me.username,
                email:    me.user_address,
            });
            this.userDataSet = true;
        }
    }

    handleError(error: any) {
        this.setUserData().then(
            () => Sentry.captureException(error.originalError || error)
        );
        console.error(error);
    }
}
