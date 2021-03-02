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

import { Observable, of } from 'rxjs';
import { DraftDeskService, DraftFormModel } from '../compose/draftdesk.service';
import { SingleMailViewerComponent } from './singlemailviewer.component';
import { MoveMessageDialogComponent } from '../actions/movemessage.action';
import { SearchService } from '../xapian/searchservice';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MessageActions } from './messageactions';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { ProgressDialog } from '../dialog/dialog.module';

export class RMM7MessageActions implements MessageActions {
    mailViewerComponent: SingleMailViewerComponent;
    dialog: MatDialog;
    snackBar: MatSnackBar;
    searchService: SearchService;
    draftDeskService: DraftDeskService;
    rmmapi: RunboxWebmailAPI;

    public updateMessages(messageIds: number[],
                          updateLocal: (messageIds: number[]) => void,
                          updateRemote: (messageIds: number[]) => Observable<any>,
                         ) {
        updateLocal(messageIds);
        updateRemote(messageIds).subscribe(() => this.searchService.updateIndexWithNewChanges());
    }

    public moveToFolder() {
        const dialogRef = this.dialog.open(MoveMessageDialogComponent);

        dialogRef.componentInstance.selectedMessageIds = [this.mailViewerComponent.messageId];
        dialogRef.afterClosed().subscribe(folder => {
            if (folder) {
                this.searchService.updateIndexWithNewChanges();
                this.mailViewerComponent.close();
            }
        });
    }

    public deleteMessage() {
        this.searchService.deleteMessages([this.mailViewerComponent.messageId]);
        this.searchService.rmmapi.deleteMessages([this.mailViewerComponent.messageId])
            .subscribe(() => {
                this.searchService.updateIndexWithNewChanges();
                this.mailViewerComponent.close();
            });
    }

    public reply(useHTML: boolean) {
        this.draftDeskService.newDraft(DraftFormModel.reply(this.mailViewerComponent.mailObj, this.draftDeskService.froms, false, useHTML));
        this.mailViewerComponent.close('goToDraftDesk');
    }

    public replyToAll(useHTML: boolean) {
        this.draftDeskService.newDraft(DraftFormModel.reply(this.mailViewerComponent.mailObj, this.draftDeskService.froms, true, useHTML));
        this.mailViewerComponent.close('goToDraftDesk');
    }

    public forward(useHTML: boolean) {
        ProgressDialog.open(this.dialog);
        this.draftDeskService.newDraft(
            DraftFormModel.forward(this.mailViewerComponent.mailObj, this.draftDeskService.froms, useHTML),
            () => {
                this.mailViewerComponent.close('goToDraftDesk');
                ProgressDialog.close();
            });
    }

    public markSeen(seen_flag_value = 1) {
        this.rmmapi.markSeen(this.mailViewerComponent.messageId, seen_flag_value)
            .subscribe(() =>
                this.mailViewerComponent.mailObj.seen_flag = seen_flag_value
        );
    }

    trainSpam(params) {
        const msg = params.is_spam ? 'Reporting spam' : 'Reporting not spam';
        const snackBarRef = this.snackBar.open(msg);
        this.rmmapi.trainSpam({ is_spam: params.is_spam, messages: [this.mailViewerComponent.messageId] }).subscribe(
            (data) => {
                if (data.status === 'error') {
                    snackBarRef.dismiss();
                    this.snackBar.open('There was an error with Spam functionality. Please try again.', 'Dismiss');
                }
                this.searchService.updateIndexWithNewChanges();
            }, (err) => {
                console.error('Error reporting spam', err);
            },
            () => {
                snackBarRef.dismiss();
            });

    }

    flag() {
        this.rmmapi.markFlagged(this.mailViewerComponent.messageId, 1)
            .subscribe(() =>
                this.mailViewerComponent.mailObj.flagged_flag = 1
            );
    }

    unflag() {
        this.rmmapi.markFlagged(this.mailViewerComponent.messageId, 0)
            .subscribe(() =>
                this.mailViewerComponent.mailObj.flagged_flag = 0
            );
    }
}
