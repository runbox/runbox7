// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2022 Runbox Solutions AS (runbox.com).
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

import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { DraftDeskService, DraftFormModel } from '../compose/draftdesk.service';
import { SingleMailViewerComponent } from './singlemailviewer.component';
import { MoveMessageDialogComponent } from '../actions/movemessage.action';
import { SearchService } from '../xapian/searchservice';
import { MessageListService } from '../rmmapi/messagelist.service';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { MessageActions } from './messageactions';
import { RunboxWebmailAPI, MessageFlagChange } from '../rmmapi/rbwebmail';
import { ProgressDialog } from '../dialog/dialog.module';

export class RMM7MessageActions implements MessageActions {
    mailViewerComponent: SingleMailViewerComponent;
    dialog: MatDialog;
    snackBar: MatSnackBar;
    searchService: SearchService;
    messageListService: MessageListService;
    draftDeskService: DraftDeskService;
    rmmapi: RunboxWebmailAPI;

    public updateMessages(args: { messageIds: number[],
                                  updateLocal: (messageIds: number[]) => void,
                                  updateRemote: (messageIds: number[]) => Observable<any>,
                                  afterwards?: (result) => void,
                                }
                         ) {
        args['updateLocal'](args['messageIds']);
        args['updateRemote'](args['messageIds']).subscribe((data) => {
            if (data['status'] === 'error' || data['status'] === 'warning') {
                this.rmmapi.showBackendErrors(data);
            } else {
                const updateFrom = data['result']['changed_time'] || 0;
                this.searchService.indexWorker.postMessage(
                    {'action': 'updateIndexWithNewChanges',
                     'args': {
                         start_message: 'Refreshing index after user action',
                         list_messages_args: [0, 0, updateFrom * 1000, RunboxWebmailAPI.LIST_ALL_MESSAGES_CHUNK_SIZE, true],
                         set_next_update_time: false,
                     } });
                if (args['afterwards']) {
                    args['afterwards'](data);
                }
            }
        });
    }

    public moveToFolder() {
        const dialogRef = this.dialog.open(MoveMessageDialogComponent);

        dialogRef.afterClosed().subscribe(folder => {
            if (folder) {
                this.updateMessages({
                    messageIds: [this.mailViewerComponent.messageId],
                    updateLocal: (msgIds: number[]) => {
                        let folderPath;
                        this.messageListService.folderListSubject.pipe(take(1))
                            .subscribe((folders) => {
                                folderPath = folders.find(fld => fld.folderId === folder).folderPath;
                            });
                        console.log('Moving to folder', folderPath, this.mailViewerComponent.messageId);
                        this.searchService.moveMessagesToFolder(msgIds, folderPath);
                        this.messageListService.moveMessages(msgIds, folderPath);
                        this.mailViewerComponent.close();
                    },
                    updateRemote: (msgIds: number[]) => {
                        const userFolders = this.messageListService.folderListSubject.value;
                        const currentFolderId = userFolders.find(fld => fld.folderPath === this.messageListService.currentFolder).folderId;
                        return this.messageListService.rmmapi.moveToFolder(msgIds, folder, currentFolderId);
                    }
                });
            }
        });
    }

    public deleteMessage() {
        this.updateMessages({
            messageIds: [this.mailViewerComponent.messageId],
            updateLocal: (msgIds: number[]) => {
                this.searchService.deleteMessages(msgIds);
                this.messageListService.moveMessages(msgIds, this.messageListService.trashFolderName);
            },
            updateRemote: (msgIds: number[]) => this.searchService.rmmapi.deleteMessages(msgIds),
            afterwards: (result) => this.mailViewerComponent.close()
        });
    }

    public reply(useHTML: boolean) {
      this.draftDeskService.newDraft(DraftFormModel.reply(
        this.mailViewerComponent.mailObj,
        this.draftDeskService.fromsSubject.value,
        false,
        useHTML
      ));
      this.mailViewerComponent.close('goToDraftDesk');
    }

    public replyToAll(useHTML: boolean) {
      this.draftDeskService.newDraft(DraftFormModel.reply(
        this.mailViewerComponent.mailObj,
        this.draftDeskService.fromsSubject.value,
        true,
        useHTML
      ));
      this.mailViewerComponent.close('goToDraftDesk');
    }

    public forward(useHTML: boolean) {
        ProgressDialog.open(this.dialog);
        this.draftDeskService.newDraft(
          DraftFormModel.forward(this.mailViewerComponent.mailObj, this.draftDeskService.fromsSubject.value, useHTML)
        ).then(() => {
            this.mailViewerComponent.close('goToDraftDesk');
            ProgressDialog.close();
        });
    }

    public markSeen(seen_flag_value = 1) {
        this.updateMessages({
            messageIds: [this.mailViewerComponent.messageId],
            updateLocal: (msgIds: number[]) => {
                msgIds.forEach( (id) => {
                    // Updates both index + messagelist
                    this.rmmapi.messageFlagChangeSubject.next(
                        new MessageFlagChange(id, seen_flag_value === 1, null)
                    );
                });
                this.mailViewerComponent.mailObj.seen_flag = seen_flag_value;
            },
            updateRemote: (msgIds: number[]) =>
                this.rmmapi.markSeen(msgIds[0], seen_flag_value)
        });
    }

    // FIXME: How does the view change? close mailview, show "next" email or?
    trainSpam(params) {
        const msg = params.is_spam ? 'Reporting spam' : 'Reporting not spam';
        const snackBarRef = this.snackBar.open(msg);
        this.updateMessages({
            messageIds: [this.mailViewerComponent.messageId],
            updateLocal: (msgIds: number[]) => {
                // Move to spam folder (delete from index), set spam flag
                if (params.is_spam) {
                    this.searchService.deleteMessages(msgIds);
                    this.messageListService.moveMessages(msgIds, this.messageListService.spamFolderName, true);
                } else {
                    // move back to inbox - do messagelist first, so
                    // the folder changes. FIXME: constant for "inbox"?
                    this.messageListService.moveMessages(msgIds, 'Inbox', true);

                    if (this.searchService.localSearchActivated) {
                      this.searchService.indexWorker.postMessage(
                        {'action': 'addMessageToIndex',
                         'args': {
                           'msginfos': [ msgIds.map((msgId) => this.messageListService.messagesById[msgId])]
                         }
                        });
                    }
                }
            },
            updateRemote: (msgIds: number[]) => {
                const res = this.rmmapi.trainSpam({is_spam: params.is_spam, messages: msgIds});
                res.subscribe(data => {
                    if ( data.status === 'error' ) {
                        snackBarRef.dismiss();
                        this.snackBar.open('There was an error with Spam functionality. Please try again.', 'Dismiss');
                    }
                }, (err) => {
                    console.error('Error reporting spam', err);
                    this.snackBar.open('There was an error with Spam functionality.', 'Dismiss');
                });
                return res;
            },
            afterwards: (result) => {
                snackBarRef.dismiss();
                this.mailViewerComponent.close();
            }
        });
    }

    blockSender(param) {
        const msg = `Blocking sender: ${param}`;
        const snackBarRef = this.snackBar.open(msg);
        this.rmmapi.blockSender(param).subscribe((res) => {
          snackBarRef.dismiss();
          if ( res.status === 'error' ) {
            this.snackBar.open('There was an error with Sender blocking functionality. Please try again.', 'Dismiss');
          } else {
            this.snackBar.open(`${param} added to blocklist.`, 'Dismiss');
          }
        });
    }

    allowListSender(param) {
        const msg = `AllowListing sender: ${param}`;
        const snackBarRef = this.snackBar.open(msg);
        this.rmmapi.allowListSender(param).subscribe((res) => {
          if ( res.status === 'error' ) {
            snackBarRef.dismiss();
            this.snackBar.open('There was an error with Sender allowlisting functionality. Please try again.', 'Dismiss');
          } else {
            this.snackBar.open(`${param} added to allowlist.`, 'Dismiss');
          }
        });
    }

    // Update mailviewer menu flag icon after flagging?
    flag() {
        this.updateMessages({
            messageIds: [this.mailViewerComponent.messageId],
            updateLocal: (msgIds: number[]) => {
                this.rmmapi.messageFlagChangeSubject.next(
                    new MessageFlagChange(msgIds[0], null, true)
                );
                this.mailViewerComponent.mailObj.flagged_flag = 1;
            },
            updateRemote: (msgIds: number[]) =>
                this.rmmapi.markFlagged(msgIds[0], 1)
        });
    }

    unflag() {
        this.updateMessages({
            messageIds: [this.mailViewerComponent.messageId],
            updateLocal: (msgIds: number[]) => {
                this.rmmapi.messageFlagChangeSubject.next(
                    new MessageFlagChange(msgIds[0], null, false)
                );
                this.mailViewerComponent.mailObj.flagged_flag = 0;
            },
            updateRemote: (msgIds: number[]) =>
                this.rmmapi.markFlagged(msgIds[0], 0)
        });
    }
}
