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

import { Component } from '@angular/core';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { RMMOfflineService } from '../rmmapi/rmmoffline.service';
import { Router } from '@angular/router';
import { LogoutService } from '../login/logout.service';
import { RunboxMe } from '../rmmapi/rbwebmail';

@Component({
    moduleId: 'angular2/app/menu/',
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'rmm-headertoolbar',
    templateUrl: 'headertoolbar.component.html'
})
export class HeaderToolbarComponent {

    rmm6tooltip = 'This area isn\'t upgraded to Runbox 7 yet and will open in a new tab';
    user_is_trial = false;
    isMainAccount: boolean;

    constructor(
        public rmmapi: RunboxWebmailAPI,
        public rmmoffline: RMMOfflineService,
        private router: Router,
        public logoutservice: LogoutService
    ) {
         rmmapi.me.subscribe((me: RunboxMe) => {
         this.isMainAccount = !me.owner;
        });
    }

    ngOnInit() {
        this.rmmapi.me.subscribe(me => {
           this.user_is_trial = me.is_trial;
      });
    }

    public mailtable() {
        this.router.navigate(['']);
    }

    public compose() {
        this.router.navigate(['compose']);
    }

    public contacts() {
        this.router.navigate(['contacts']);
    }
}
