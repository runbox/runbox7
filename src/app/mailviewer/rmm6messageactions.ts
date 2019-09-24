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

import { MessageActions } from './messageactions';
import { SingleMailViewerComponent } from './singlemailviewer.component';
import { MatSnackBar } from '@angular/material';
import { HttpClient } from '@angular/common/http';

declare var openCompose: (url: string) => void;

export class RMM6MessageActions implements MessageActions {
    mailViewerComponent: SingleMailViewerComponent;
    snackBar: MatSnackBar;
    http: HttpClient;

    moveToFolder() {
        this.snackBar.open('Not supported in RMM6 yet', null, {duration: 1000});
    }

    openCompose(url: string) {
        if (window['rmmangular_new_window_template']) {
            openCompose(url);
        } else {
            location.href = url;
        }
    }

    trashMessage() {
        location.href = '/mail/list?delete_msg=1&message=' + this.mailViewerComponent.messageId;
    }

    reply() {
        this.openCompose('/mail/reply?message=' + this.mailViewerComponent.messageId);
    }

    replyToAll() {
        this.openCompose('/mail/replyall?message=' + this.mailViewerComponent.messageId);
    }

    forward() {
        this.openCompose('/mail/forward?message=' + this.mailViewerComponent.messageId);
    }

    markSeen(seen_flag_value = 1) {
        this.http.put('/rest/v1/email/' + this.mailViewerComponent.messageId, JSON.stringify(
            { seen_flag : seen_flag_value }))
            .subscribe(() => console.log('marked ' + this.mailViewerComponent.messageId + ' as seen'));
    }

    reportSpam() {
        this.snackBar.open('Not yet implemented', 'OK');
    }

    notSpam() {
        this.snackBar.open('Not yet implemented', 'OK');
    }

    flag() {
        throw new Error('Method not implemented.');
    }

    unflag() {
        throw new Error('Method not implemented.');
    }

    trainSpam() {
        throw new Error('Method not implemented.');
    }
}
