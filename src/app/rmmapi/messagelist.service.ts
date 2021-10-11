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

import { throwError as observableThrowError, BehaviorSubject, ReplaySubject, AsyncSubject } from 'rxjs';
import { catchError, distinctUntilChanged, map, filter, take } from 'rxjs/operators';

import { MessageInfo } from '../common/messageinfo';

import { RunboxWebmailAPI, FolderListEntry } from './rbwebmail';
import { SearchService } from '../xapian/searchservice';

export class FolderMessageCountEntry {
    constructor(
        public unread: number,
        public total:  number,
    ) { }

    static of(folder: FolderListEntry) {
        return new this(
            folder.newMessages,
            folder.totalMessages,
        );
    }
}

export interface FolderMessageCountMap {
    [folderPath: string]: FolderMessageCountEntry;
}

@Injectable()
export class MessageListService {
    messagesInViewSubject: BehaviorSubject<MessageInfo[]> = new BehaviorSubject([]);
    folderListSubject: BehaviorSubject<FolderListEntry[]> = new BehaviorSubject([]);
    folderMessageCountSubject: ReplaySubject<FolderMessageCountMap> = new ReplaySubject(1);

    currentFolder = 'Inbox';

    folderMessageLists: { [folder: string]: MessageInfo[] } = {};
    messagesById: { [id: number]: MessageInfo } = {};
    folderCounts: FolderMessageCountMap;

    trashFolderName = 'Trash';
    spamFolderName = 'Spam';

    ignoreUnreadInFolders = [ 'Sent' ];

    public fetchInProgress = false;

    // Initialized "manually" by SearchService.
    // Can't be depedency-injected because of a circular dependency
    public searchservice = new AsyncSubject<SearchService>();

    constructor(
        public rmmapi: RunboxWebmailAPI
    ) {
        this.refreshFolderList();

        this.folderListSubject
            .pipe(distinctUntilChanged((prev: FolderListEntry[], curr: FolderListEntry[]) => {
                return prev.length === curr.length
                    && prev.every((f, index) =>
                        f.folderId === curr[index].folderId
                        && f.totalMessages === curr[index].totalMessages
                        && f.newMessages === curr[index].newMessages);
            }))
            .subscribe((folders) => {
                // Will fallback on the folder counters set above for folders not in the search index
                this.refreshFolderCounts();
            });
        rmmapi.messageFlagChangeSubject.pipe(
                filter((msgFlagChange) => this.messagesById[msgFlagChange.id] ? true : false)
            ).subscribe((msgFlagChange) => {
                if (msgFlagChange.seenFlag === true || msgFlagChange.seenFlag === false) {
                    const msg = this.messagesById[msgFlagChange.id];
                    const msgSeenFlag = msg.seenFlag;
                    this.messagesById[msgFlagChange.id].seenFlag = msgFlagChange.seenFlag;
                    if (msgSeenFlag !== this.messagesById[msgFlagChange.id].seenFlag) {
                        this.folderCounts[msg.folder].unread = msgFlagChange.seenFlag === true
                            ? this.folderCounts[msg.folder].unread - 1
                            : this.folderCounts[msg.folder].unread + 1;
                        // remove from cache so that it will be
                        // refetched with the new status when we next
                        // visit it
                        this.rmmapi.deleteCachedMessageContents(msgFlagChange.id);
                    }
                }
                if (msgFlagChange.flaggedFlag === true || msgFlagChange.flaggedFlag === false) {
                    this.messagesById[msgFlagChange.id].flaggedFlag = msgFlagChange.flaggedFlag;
                    this.rmmapi.deleteCachedMessageContents(msgFlagChange.id);
                }
                // update local results ASAP, schedule API results for later
                // Message counts update
                this.folderMessageCountSubject.next(this.folderCounts);
                // current folder contents update
                this.messagesInViewSubject.next(this.folderMessageLists[this.currentFolder]);
            });
    }

    public setCurrentFolder(folder: string) {
        this.currentFolder = folder;
        this.searchservice.pipe(take(1)).subscribe(searchservice => {
            if (!searchservice.localSearchActivated ||
                folder === this.spamFolderName ||
                folder === this.trashFolderName) {
                // Always fetch fresh folder listing when setting current folder
                this.folderMessageLists[folder] = [];

                this.fetchFolderMessages();
            }
        });
    }

    // This will only be definitely correct (for trash+spam) if we have recently
    // updated the folderlist - never call this directly, always call
    // refreshFolderList
    public refreshFolderCounts(): Promise<void> {
        return new Promise((resolve, _) => {
            return this.searchservice.pipe(take(1)).subscribe(searchservice => {
                const xapianFolders = new Set(
                    searchservice.localSearchActivated
                        ?  searchservice.api.listFolders().map(f => f[0])
                        : []
                );

                const folders = this.folderListSubject.value;
                const folderCounts = {};
                for (const folder of folders) {
                    const path = folder.folderPath;
                    const xapianPath = path.replace(/\//g, '.');

                    if (xapianFolders.has(xapianPath)) {
                        const res = searchservice.api.getFolderMessageCounts(xapianPath);
                        folderCounts[path] = new FolderMessageCountEntry(res[1], res[0]);
                    } else {
                        folderCounts[path] = FolderMessageCountEntry.of(folder);
                    }
                }
                this.folderCounts = folderCounts;
                this.folderMessageCountSubject.next(folderCounts);

                resolve();
            });
        });
    }

    public refreshFolderList(): Promise<FolderListEntry[]> {
        return new Promise((resolve, _) => {
            this.rmmapi.getFolderList()
                .subscribe((folders) => {
                    const trashfolder = folders.find(folder => folder.folderType === 'trash');
                    if (trashfolder) {
                        this.trashFolderName = trashfolder.folderName;
                    }
                    const spamfolder = folders.find(folder => folder.folderType === 'spam');
                    if (spamfolder) {
                        this.spamFolderName = spamfolder.folderName;
                    }

                    this.folderListSubject.next(folders);
                    resolve(folders);
                });
        });
    }

    public requestMoreData(currentlimit: number) {
        const messageList = this.folderMessageLists[this.currentFolder];
        if (messageList && messageList.length === currentlimit && currentlimit % RunboxWebmailAPI.LIST_ALL_MESSAGES_CHUNK_SIZE === 0) {
            this.fetchFolderMessages();
        }
    }

    // Due to rmm7messageactions doing local updates (messagelist contents etc)
    // first, then updating the API and forcing an index/messagelist update
    // this code is likely to only find changes when contents have been
    // changed outside of runbox (eg via IMAP)
    public applyChanges(msgInfos: MessageInfo[], delMsgInfos: number[]) {
        const filterFolders: { [folder: string]: boolean } = {};

        // New messages
        msgInfos
            .filter((msg) => this.messagesById[msg.id] === undefined)
            .forEach((msg) => {
                this.messagesById[msg.id] = msg;
                if (!this.folderMessageLists[msg.folder]) {
                    this.folderMessageLists[msg.folder] = [];
                }
                const newFolderMessageIndex = this.folderMessageLists[msg.folder].findIndex((m) => msg.id > m.id);
                if (newFolderMessageIndex > -1) {
                    this.folderMessageLists[msg.folder]
                        .splice(newFolderMessageIndex, 0, msg);
                } else {
                    this.folderMessageLists[msg.folder].push(msg);
                }
            });

        // Messages moved to another folder or deleted (moved to trash)
        msgInfos
            .filter((msg) =>
                this.messagesById[msg.id] &&
                this.messagesById[msg.id].folder !== msg.folder
            )
            .forEach((msg) => {
                filterFolders[this.messagesById[msg.id].folder] = true;
                this.messagesById[msg.id].folder = msg.folder;

                msg = this.messagesById[msg.id];

                if (this.folderMessageLists[msg.folder]) {
                    const newFolderMessageIndex = this.folderMessageLists[msg.folder].findIndex((m) => msg.id > m.id);

                    if (newFolderMessageIndex > -1) {
                        this.folderMessageLists[msg.folder]
                            .splice(newFolderMessageIndex, 0, msg);
                    } else {
                        this.folderMessageLists[msg.folder].push(msg);
                    }
                }
            });
        // Messages status changed (read/unread)
        msgInfos
            .filter((msg) =>
                this.messagesById[msg.id] &&
                this.messagesById[msg.id].seenFlag !== msg.seenFlag
            )
            .forEach((msg) => {
                this.messagesById[msg.id].seenFlag = msg.seenFlag;
            });

        // messages permanently deleted (removed from trash
        delMsgInfos
            .forEach((msgId) => {
                const msg = this.messagesById[msgId];
                if (msg && this.folderMessageLists[msg.folder]) {
                    const delFolderMessageIndex = this.folderMessageLists[msg.folder].findIndex((m) => msgId === m.id);

                    if (delFolderMessageIndex > -1) {
                        this.folderMessageLists[msg.folder]
                            .splice(delFolderMessageIndex, 1);
                    }
                    delete this.messagesById[msgId];
                }
            });

        Object.keys(filterFolders)
            .filter((fld) => this.folderMessageLists[fld])
            .forEach((fld) => {
                this.folderMessageLists[fld] = this.folderMessageLists[fld].filter((msg) =>
                    msg.folder === fld);
            });

        // Update the folderlist every index update, regardless of
        // known changes rmm7messageactions.updateMessages changes
        // messagelist data, then updates the backend, so applyChanges
        // won't have anything to do unless its pulling changes
        // made from outside of runbox7 (eg via IMAP)
        this.messagesInViewSubject.next(this.folderMessageLists[this.currentFolder]);
        this.refreshFolderList();
    }

    // When emptying the trash we delete from here first
    // (then update backend + index)
    public pretendEmptyTrash() {
        // Set these locally, main trash emptying will come along and
        // offically update them later
        this.folderCounts[this.trashFolderName].unread = 0;
        this.folderCounts[this.trashFolderName].total = 0;

        // Just lie a bit, we'll fix it in a mo..
        this.folderMessageCountSubject.next(this.folderCounts);
        this.folderMessageLists[this.trashFolderName] = [];
    }

    // almost duplicate of code in applyChanges, except for hasChanges!?
    // Permanent delete
    public deleteTrashMessages(messageIds: number[]) {
        messageIds.forEach((msgId) => {
            const msg = this.messagesById[msgId];
            if (msg && this.folderMessageLists[msg.folder]) {
                const delFolderMessageIndex = this.folderMessageLists[msg.folder].findIndex((m) => msgId === m.id);

                if (delFolderMessageIndex > -1) {
                    this.folderMessageLists[msg.folder]
                        .splice(delFolderMessageIndex, 1);
                }
                this.folderCounts[this.trashFolderName].total++;
                if (!msg.seenFlag) {
                    this.folderCounts[this.trashFolderName].unread++;
                }
                delete this.messagesById[msgId];
            }
        });
        // Message counts update
        this.folderMessageCountSubject.next(this.folderCounts);
        // current folder contents update
        this.messagesInViewSubject.next(this.folderMessageLists[this.currentFolder]);
    }

    // Non-index users (or trash/spam) - move to other folder
    public moveMessages(messageIds: number[], folderName: string, decache: boolean = false) {
        messageIds.forEach((msgId) => {
            const msg = this.messagesById[msgId];
            if (!msg) {
                return;
            }
            if (msg.folder === folderName) {
                return;
            }

            // Remove from visible emails
            // If we havent loaded/viewed this folder, we won't have any
            if (this.folderMessageLists[msg.folder]) {
                const msgPos = this.folderMessageLists[msg.folder].findIndex((m) => msg.id === m.id);
                if (msgPos > -1 ) {
                    this.folderMessageLists[msg.folder]
                        .splice(msgPos, 1);
                }
            }
            // Update counts regardless
            this.folderCounts[msg.folder].total--;
            if (!msg.seenFlag) {
                this.folderCounts[msg.folder].unread--;
            }

            // Not already in target folder so move it there:
            msg.folder = folderName;
            // reinsert into trash (assuming we've loaded trash)
            if (this.folderMessageLists[folderName]) {
                const msgNewIndex = this.folderMessageLists[folderName].findIndex((m) => msg.id > m.id);
                if (msgNewIndex > -1) {
                    this.folderMessageLists[folderName]
                        .splice(msgNewIndex, 0, msg);
                } else {
                    this.folderMessageLists[folderName].push(msg);
                }
            }

            // if requested, remove from cache (eg for enforcing
            // refresh of emails moved to spam folder, to display the
            // correct icon
            if (decache) {
                this.rmmapi.deleteCachedMessageContents(msgId);
            }

            this.folderCounts[folderName].total++;
            if (!msg.seenFlag) {
                this.folderCounts[folderName].unread++;
            }
        });
        // Message counts update
        this.folderMessageCountSubject.next(this.folderCounts);
        // current folder contents update
        this.messagesInViewSubject.next(this.folderMessageLists[this.currentFolder]);
    }

    public fetchFolderMessages() {
        if (this.fetchInProgress) {
            return;
        }
        this.fetchInProgress = true;
        const folder = this.currentFolder;
        if (!this.folderMessageLists[folder]) {
            this.folderMessageLists[folder] = [];
        }
        const messageList = this.folderMessageLists[folder];
        const sinceid = messageList.length > 0 ? messageList[messageList.length - 1].id : 0;
        this.rmmapi.listAllMessages(0, sinceid, 0,
            RunboxWebmailAPI.LIST_ALL_MESSAGES_CHUNK_SIZE
            , true, folder)
            .pipe(
                map((messages) => messages.filter(m => m.deletedFlag ? false : true)),
                catchError((e) => {
                    this.fetchInProgress = false;
                    return observableThrowError(e);
                }))
            .subscribe((res) => {
                if (res && res.length > 0) {
                    this.folderMessageLists[folder] = messageList.concat(res);
                    res.forEach((m: MessageInfo) => this.messagesById[m.id] = m);
                }
                this.messagesInViewSubject.next(this.folderMessageLists[this.currentFolder]);
                this.fetchInProgress = false;
            });
    }
}
