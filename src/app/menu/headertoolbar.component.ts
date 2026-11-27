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
import { RunboxMe, RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { RMMOfflineService } from '../rmmapi/rmmoffline.service';
import { Router } from '@angular/router';
import { LogoutService } from '../login/logout.service';
import { FolderMessageCountMap, MessageListService } from '../rmmapi/messagelist.service';

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'rmm-headertoolbar',
    templateUrl: 'headertoolbar.component.html'
})
export class HeaderToolbarComponent implements OnInit {

    rmm6tooltip = 'This area isn\'t upgraded to Runbox 7 yet and will open in a new tab';
    user_is_trial = false;
    isMainAccount: boolean;
    mailUnreadCount = 0;

    constructor(
        public rmmapi: RunboxWebmailAPI,
        public rmmoffline: RMMOfflineService,
        private router: Router,
        public logoutservice: LogoutService,
        messagelistservice: MessageListService
    ) {
         rmmapi.me.subscribe((me: RunboxMe) => {
         this.isMainAccount = !me.owner;
        });
        messagelistservice.folderMessageCountSubject.subscribe(counts => {
            this.mailUnreadCount = this.sumUnreadMail(counts);
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

    get mailMenuAriaLabel(): string {
        if (this.mailUnreadCount === 0) {
            return 'Mail';
        }

        const messageLabel = this.mailUnreadCount === 1 ? 'message' : 'messages';
        return `Mail, ${this.mailUnreadCount} unread ${messageLabel}`;
    }

    private sumUnreadMail(counts: FolderMessageCountMap): number {
        if (!counts) {
            return 0;
        }

        return Object.keys(counts).reduce((total, folder) => {
            const unread = counts[folder]?.unread || 0;
            return total + (unread > 0 ? unread : 0);
        }, 0);
    }
}
