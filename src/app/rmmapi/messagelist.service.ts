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

import {throwError as observableThrowError,  BehaviorSubject ,  Observable, ReplaySubject } from 'rxjs';
import { Injectable } from '@angular/core';
import { RunboxWebmailAPI, FolderListEntry } from './rbwebmail';
import { SearchService } from '../xapian/searchservice';
import { MessageInfo } from '../xapian/messageinfo';
import { AppComponent } from '../app.component';
import { CanvasTableColumn } from '../canvastable/canvastable';
import { MessageTableRowTool } from '../messagetable/messagetablerow';
import { catchError, map, filter, take } from 'rxjs/operators';

export class FolderMessageCountEntry {
    constructor(
        public unread: number,
        public total:  number,
    ) { }
}

export interface FolderMessageCountMap {
    [folderPath: string]: FolderMessageCountEntry;
}

@Injectable()
export class MessageListService {
    messagesInViewSubject: BehaviorSubject<MessageInfo[]> = new BehaviorSubject([]);
    folderListSubject: BehaviorSubject<FolderListEntry[]> = new BehaviorSubject([]);
    folderMessageCountSubject: ReplaySubject<FolderMessageCountMap> = new ReplaySubject(1);
    folders: BehaviorSubject<any[]> = new BehaviorSubject([]);

    currentFolder = 'Inbox';

    folderMessageLists: { [folder: string]: MessageInfo[] } = {};
    messagesById: { [id: number]: MessageInfo } = {};

    trashFolderName = 'Trash';
    spamFolderName = 'Spam';

    public fetchInProgress = false;
    // Initialized "manually" by SearchService.
    // Can't be depedency-injected because of a circular dependency
    public searchservice: SearchService;

    constructor(
        public rmmapi: RunboxWebmailAPI
    ) {
        this.refreshFolderList().then(folders => this.folderMessageCountSubject.next(this.getFolderCountsFor(folders)));

        this.folderListSubject.subscribe((foldercounts) =>
            this.folders.next(
                foldercounts.map((fld) => [fld.folderName, fld.totalMessages,
                    fld.newMessages, fld.folderPath, fld.folderLevel, fld.folderType
                    , false, // Folder is not in local index but we're showing from the database here so don't mark as grey
                fld.folderId
                ]
                ))
        );

        rmmapi.messageFlagChangeSubject.pipe(
                filter((msgFlagChange) => this.messagesById[msgFlagChange.id] ? true : false)
            ).subscribe((msgFlagChange) => {
                if (msgFlagChange.seenFlag === true || msgFlagChange.seenFlag === false) {
                    this.messagesById[msgFlagChange.id].seenFlag = msgFlagChange.seenFlag;
                }
                if (msgFlagChange.flaggedFlag === true || msgFlagChange.flaggedFlag === false) {
                    this.messagesById[msgFlagChange.id].flaggedFlag = msgFlagChange.flaggedFlag;
                }
                this.refreshFolderCounts();
            });
    }

    public setCurrentFolder(folder: string) {
        this.currentFolder = folder;
        if (!this.searchservice.localSearchActivated ||
            folder === this.spamFolderName ||
            folder === this.trashFolderName) {
            // Always fetch fresh folder listing when setting current folder
            this.folderMessageLists[folder] = [];

            this.fetchFolderMessages();
        }
    }

    private getFolderCountsFor(folders: FolderListEntry[]): FolderMessageCountMap {
        const folderCounts = {};
        for (const f of folders) {
            folderCounts[f.folderPath] = new FolderMessageCountEntry(
                f.newMessages,
                f.totalMessages,
            );
        }
        return folderCounts;
    }

    public refreshFolderCounts() {
        if (this.searchservice.localSearchActivated) {
            this.folderListSubject.pipe(take(1)).subscribe((folders) => {
                const folderCounts = {};
                for (const path of folders.map(f => f.folderPath)) {
                    folderCounts[path] = this.searchservice.getMessageCountsForFolder(path);
                }
                this.folderMessageCountSubject.next(folderCounts);
            });
        } else {
            this.refreshFolderList().then(
                folders => this.folderMessageCountSubject.next(this.getFolderCountsFor(folders))
            );
        }
    }

    public refreshFolderList(): Promise<FolderListEntry[]> {
        return new Promise((resolve, _) => {
            this.rmmapi.getFolderList().subscribe((folders) => {
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

    public applyChanges(msgInfos: MessageInfo[]) {
        const filterFolders: { [folder: string]: boolean } = {};

        let hasChanges = false;
        // New messages
        msgInfos
            .filter((msg) => this.messagesById[msg.id] === undefined)
            .forEach((msg) => {
                hasChanges = true;
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
                hasChanges = true;
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

        Object.keys(filterFolders)
            .filter((fld) => this.folderMessageLists[fld])
            .forEach((fld) => {
                this.folderMessageLists[fld] = this.folderMessageLists[fld].filter((msg) =>
                    msg.folder === fld);
            });

        if (hasChanges) {
            this.messagesInViewSubject.next(this.folderMessageLists[this.currentFolder]);
            this.refreshFolderList();
        }
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

    getFromColumnValueForRow(rowobj: MessageInfo): string {
        return rowobj.from && rowobj.from.length > 0 ?
            rowobj.from[0].name ? rowobj.from[0].name :
                rowobj.from[0].address :
            '';
    }

    getToColumnValueForRow(rowobj: MessageInfo): string {
        return rowobj.to && rowobj.to.length > 0 ?
            rowobj.to[0].name ? rowobj.to[0].name :
                rowobj.to[0].address :
            '';
    }

    public getCanvasTableColumns(app: AppComponent): CanvasTableColumn[] {
        const columns: CanvasTableColumn[] = [
            {
                sortColumn: null,
                name: '',
                rowWrapModeHidden: false,
                getValue: (rowobj: MessageInfo): any => app.isSelectedRow(rowobj),
                checkbox: true,
                draggable: true
            },
            {
                name: 'Date',
                sortColumn: null,
                rowWrapModeMuted: true,
                getValue: (rowobj: MessageInfo): string => MessageTableRowTool.formatTimestamp(rowobj.messageDate.toJSON()),
            },
            {
                name: this.currentFolder === 'Sent' ? 'To' : 'From',
                sortColumn: null,
                getValue: this.currentFolder === 'Sent' ? this.getToColumnValueForRow : this.getFromColumnValueForRow,
            },
            {
                name: 'Subject',
                sortColumn: null,
                getValue: (rowobj: MessageInfo): string => rowobj.subject,
                draggable: true
            },
            {
                sortColumn: null,
                name: 'Size',
                rowWrapModeHidden: true,
                textAlign: 1,
                getValue: (rowobj: MessageInfo): number => rowobj.size,
                getFormattedValue: MessageTableRowTool.formatBytes,
            },
            {
                sortColumn: null,
                name: '',
                textAlign: 2,
                rowWrapModeHidden: true,
                font: '16px \'Material Icons\'',
                getValue: (rowobj: MessageInfo): boolean => rowobj.attachment,
                getFormattedValue: (val) => val ? '\uE226' : ''
            },
            {
                sortColumn: null,
                name: '',
                textAlign: 2,
                rowWrapModeHidden: true,
                font: '16px \'Material Icons\'',
                getValue: (rowobj: MessageInfo): boolean => rowobj.answeredFlag,
                getFormattedValue: (val) => val ? '\uE15E' : ''
            },
            {
                sortColumn: null,
                name: '',
                textAlign: 2,
                rowWrapModeHidden: true,
                font: '16px \'Material Icons\'',
                getValue: (rowobj: MessageInfo): boolean => rowobj.flaggedFlag,
                getFormattedValue: (val) => val ? '\uE153' : ''
            }
        ];

        return columns;
    }
}
