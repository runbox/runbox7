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

import {Injectable, NgZone} from '@angular/core';
import { Observable ,  AsyncSubject,  Subject ,  of, from  } from 'rxjs';
import { XapianAPI } from './rmmxapianapi';
import { RunboxWebmailAPI, FolderCountEntry } from '../rmmapi/rbwebmail';
import { MessageInfo,
    IndexingTools } from './messageinfo';
import { CanvasTableColumn} from '../canvastable/canvastable';
import { AppComponent } from '../app.component';
import { MessageTableRowTool} from '../messagetable/messagetablerow';
import { MatSnackBar, MatDialog, MatSnackBarRef } from '@angular/material';
import { ProgressDialog } from '../dialog/progress.dialog';
import { MessageListService } from '../rmmapi/messagelist.service';
import { mergeMap, map, filter, catchError, tap, take, bufferCount } from 'rxjs/operators';
import { HttpClient, HttpRequest, HttpResponse, HttpEventType } from '@angular/common/http';
import { ConfirmDialog } from '../dialog/confirmdialog.component';
import { DownloadableSearchIndexMap, DownloadablePartition } from './downloadablesearchindexmap.class';
import { SyncProgressComponent } from './syncprogress.component';
import { xapianLoadedSubject } from './xapianwebloader';
import { InfoDialog, InfoParams } from '../dialog/info.dialog';

declare var FS;
declare var IDBFS;
declare var Module;

const XAPIAN_TERM_FOLDER = 'XFOLDER:';
const XAPIAN_TERM_FLAGGED = 'XFflagged';
const XAPIAN_TERM_SEEN = 'XFseen';
const XAPIAN_TERM_ANSWERED = 'XFanswered';
const XAPIAN_TERM_DELETED = 'XFdeleted';
const XAPIAN_TERM_MISSING_BODY_TEXT = 'XFmissingbodytext';

export const XAPIAN_GLASS_WR = 'xapianglasswr';

export class SearchIndexDocumentData {
  id: string;
  from: string;
  subject: string;
  recipients: string;
  textcontent: string;
  folder?: string;
  flagged?: boolean;
  seen?: boolean;
  answered?: boolean;
  deleted?: boolean;
  attachment?: boolean;
}

export class SearchIndexDocumentUpdate {
  constructor(
    public id: number,
    public updateFunction: () => void
  ) {}
}

@Injectable()
export class SearchService {

  public api: XapianAPI;
  public indexingTools: IndexingTools;

  public initSubject: AsyncSubject<any> = new AsyncSubject();
  public noLocalIndexFoundSubject: AsyncSubject<any> = new AsyncSubject();

  // This is fired when UI should refresh the search ( search results altered )
  public searchResultsSubject: Subject<any> = new Subject();

  public localSearchActivated = false;
  public downloadProgress: number = null;

  public downloadableIndexExists = false;
  public indexCreationStarted = false;

  // On first page load we don't want notifications for new messages
  notifyOnNewMessages = false;

  public indexLastUpdateTime = 0; // Epoch time
  public indexUpdateIntervalId: any = null;

  // Listing all messages happens in chunks of 1000 - page is controlled here
  public listAllMessagesPage = 0;
  public processMessageHistoryCount = 0;
  public processMessageHistoryProgress = 0;
  public processMessageHistorySkipLiveTableUpdates = true;

  public skipLiveUpdatesIndexingMessageContent = false;

  numberOfMessagesSyncedLastTime: number;
  folderCountDiscrepanciesCheckedCount: {[folderName: string]: number} = {};

  processedUpdatesMap = {};

  lowestindexid = 0;

  serverIndexSize = -1;
  serverIndexSizeUncompressed = -1;

  memindexdir = 'rmmmemoryindex';
  localdir: string;
  partitionsdir: string;

  initcalled = false;
  partitionDownloadProgress: number = null;

  persistIndexInProgressSubject: AsyncSubject<any> = null;
  indexNotPersisted = false;

  /**
   * Extra per message verification of index contents to assure that it is in sync with the database
   * (workaround while waiting for deleted_messages support, but also a good extra check)
   */
  pendingIndexVerifications: {[id: string]: SearchIndexDocumentData} = {};

  messageProcessingInProgressSubject: AsyncSubject<any> = null;
  pendingMessagesToProcess: SearchIndexDocumentUpdate[];
  processMessageIndex = 0;

  /**
   * Used by the canvas table. We store one row at the time so that we don't look up the document data
   * from the search index db multiple times (for each column) when processing a row
   */
  currentXapianDocId: number;
  currentDocData: SearchIndexDocumentData;

  constructor(public rmmapi: RunboxWebmailAPI,
       private httpclient: HttpClient,
       private ngZone: NgZone,
       private snackbar: MatSnackBar,
       private dialog: MatDialog,
       private messagelistservice: MessageListService) {

      this.messagelistservice.searchservice = this;
      // Check if we have a local index stored
      this.rmmapi.me.pipe(
        map((me) => {
          this.localdir = 'rmmsearchservice' + me.uid;
          this.partitionsdir = '/partitions' + this.localdir;
        }),
          mergeMap(() =>
          new Observable<any>((observer) => {
            const idbrequest: IDBOpenDBRequest = window.indexedDB.open('/' + this.localdir);
            idbrequest.onsuccess = () => observer.next(idbrequest.result);
          })
        ),
        mergeMap((db: IDBDatabase) =>
          new Observable<any>((observer) => {
            try {
              const req: IDBRequest = db.transaction('FILE_DATA', 'readonly')
                .objectStore('FILE_DATA')
                .get('/' + this.localdir + '/xapianglasswr/iamglass');
              req.onsuccess = () => {
                  if (req.result !== undefined) {
                    observer.next(true);
                  } else {
                    observer.next(false);
                  }
                  db.close();
                };
              } catch (e) {
                console.log('Unable to open local xapian index', (e ? e.message : ''));
                db.close();
                observer.next(false);
              }
          })
        )
      ).subscribe((hasLocalIndex: boolean) => {
        if (hasLocalIndex) {
          this.init();
        } else {
          // We have no local index - but still need the polling loop here
          this.indexLastUpdateTime = new Date().getTime(); // Set the last update time to now since we don't have a local index
          this.updateIndexWithNewChanges();
          this.noLocalIndexFoundSubject.next(true);
          this.noLocalIndexFoundSubject.complete();
          this.initSubject.next(false);
          this.initSubject.complete();
        }
      });
  }

  public init() {
    if (this.initcalled) {
      return;
    }
    this.initcalled = true;

    this.downloadProgress = 0; // Set indeterminate progress bar

    // Update locally generated index with message seen flag
    this.rmmapi.messageFlagChangeSubject
      .pipe(
        mergeMap((msgFlagChange) => {
          if (msgFlagChange.flaggedFlag !== null) {
            return this.postMessagesToXapianWorker([new SearchIndexDocumentUpdate(
              msgFlagChange.id,
                () => this.indexingTools.flagMessage(msgFlagChange.id, msgFlagChange.flaggedFlag)
            )]);
          } else if (msgFlagChange.seenFlag !== null) {
            return this.postMessagesToXapianWorker([
              new SearchIndexDocumentUpdate(
              msgFlagChange.id,
              () => this.indexingTools.markMessageSeen(msgFlagChange.id, msgFlagChange.seenFlag)
            )]);
          } else {
            console.error('Empty flag change message', msgFlagChange);
          }
        })
      )
      .subscribe();

    xapianLoadedSubject.subscribe(() => {
      const initXapianFileSys = () => {
        this.api =  new XapianAPI();
        this.indexingTools = new IndexingTools(this.api);

        FS.mkdir(this.localdir);
        FS.mount(IDBFS, {}, '/' + this.localdir);
        FS.chdir('/' + this.localdir);
        console.log('Local dir is ' + this.localdir);

        FS.syncfs(true, (err) => {
          console.log('File system synced - starting Xapian');

          FS.mkdir(this.partitionsdir); // Partitions will sync later down if there is a main partition
          FS.mount(IDBFS, {}, this.partitionsdir);

          try {
            console.log('Last index timestamp ', FS.stat('xapianglasswr/docdata.glass').mtime);

            this.openStoredMainPartition();

            const docCount: number = this.api.getXapianDocCount();
            console.log(docCount, 'docs in Xapian database');

            try {
              this.indexLastUpdateTime = parseInt(FS.readFile('indexLastUpdateTime', { encoding: 'utf8' }), 10);
            } catch (e) {
              if (!this.updateIndexLastUpdateTime()) {
                // Corrupt xapian index - delete it and subscribe to changes (fallback to websocket search)
                this.deleteLocalIndex().subscribe(() => this.updateIndexWithNewChanges());
                return;
              }
            }

            this.localSearchActivated = true;
            this.initSubject.next(true);

            FS.syncfs(true, () => {
              console.log('Loading partitions');
              this.openStoredPartitions();
              this.searchResultsSubject.next();
              this.updateIndexWithNewChanges();
            });


          } catch (e) {
            console.log('No xapian db');
            this.initSubject.next(false);
          }

          this.downloadProgress = null; // Set indeterminate progress bar
          this.initSubject.complete();
        });
      };

      initXapianFileSys();
    });
  }

  private openStoredPartitions() {
    try {
      FS.readdir(this.partitionsdir).forEach((f) => {
        if ( f !== '.' && f !== '..' &&
          FS.isDir(FS.stat(`${this.partitionsdir}/${f}`).mode)) {
          console.log('adding partition ', f);

          this.api.addFolderXapianIndex(`${this.partitionsdir}/${f}`);
        }
      });
    } catch (e) {}
  }

  private openStoredMainPartition() {
    this.api.initXapianIndex(XAPIAN_GLASS_WR);
  }
  /**
   * Returns false if unable to get dates from xapian index (corrupt index)
   */
  public updateIndexLastUpdateTime(): boolean {
    this.api.clearValueRange();
    const results  = this.api.sortedXapianQuery(
          '',
          2, // Column 2 is the message date column
          1, // Sort descending
          0,
          1, // We only need the latest message
          -1 // We don't need grouped results
    );

    if (results.length > 0) {
      try {
        console.log(results);
        console.log(this.api.getStringValue(results[0][0], 2));
        // Get date of latest message
        const dateParts = this.api.getStringValue(results[0][0], 2)
                      .match(/([0-9][0-9][0-9][0-9])([0-9][0-9])([0-9][0-9])/)
                      .map((val, ndx) => ndx > 0 ? parseInt(val, 10) : 0);

        const latestSearchIndexDate = new Date(dateParts[1], dateParts[2] - 1, dateParts[3]);
        console.log('Latest search index date is', latestSearchIndexDate);
        this.indexLastUpdateTime = latestSearchIndexDate.getTime();
      } catch (e) {
        console.log('Corrupt Xapian index', e);
        // this.indexLastUpdateTime = 0;
        this.indexLastUpdateTime = new Date().getTime();
        return false;
      }
    } else {
      this.indexLastUpdateTime = 0;
      console.log('Empty Xapian index');
    }
    return true;
  }

  public deleteLocalIndex(): Observable<any> {
    this.localSearchActivated = false;

    return new Observable((observer) => {
      ProgressDialog.open(this.dialog);

      this.api.closeXapianDatabase();

      FS.readdir(XAPIAN_GLASS_WR).forEach((f) => {
        if ( f !== '.' && f !== '..') {
          console.log(f);
          FS.unlink('xapianglasswr/' + f);
        }
      });
      FS.rmdir(XAPIAN_GLASS_WR);
      try {
        FS.unlink('xapianglass');
      } catch (e) {}



      // clearTimeout(this.indexUpdateIntervalId);

      let hasPartitionsDir = true;
      try {
        FS.stat(this.partitionsdir);
      } catch (e) {
        hasPartitionsDir = false;
      }
      if (hasPartitionsDir) {
        FS.readdir(this.partitionsdir).forEach((f) => {
          if ( f !== '.' && f !== '..') {

            if (FS.isDir(FS.stat(`${this.partitionsdir}/${f}`).mode)) {
              console.log('Removing director', f);
              FS.readdir(`${this.partitionsdir}/${f}`)
                .filter((ent: string) => ent.charAt(0) !== '.').forEach(partitionFile =>
                FS.unlink(`${this.partitionsdir}/${f}/${partitionFile}`)
              );
              FS.rmdir(`${this.partitionsdir}/${f}`);
            } else {
              FS.unlink(`${this.partitionsdir}/${f}`);
            }
          }
        });
      }

      console.log('Closing indexed dbs');
      // ---- Hack for emscripten not closing databases
      Object.keys(IDBFS.dbs).forEach(k => IDBFS.dbs[k].close());
      IDBFS.dbs = {};

      // ----------------------

      new Observable(o => {
        console.log('Deleting indexeddb database', '/' + this.localdir);
        const req = window.indexedDB.deleteDatabase('/' + this.localdir);
        req.onsuccess = () =>
          o.next();
      }).pipe(
        mergeMap(() =>
          new Observable(o => {
            console.log('Deleting indexeddb database', this.partitionsdir);
            const req = window.indexedDB.deleteDatabase(this.partitionsdir);
            req.onsuccess = () =>
              o.next();
          })
        )
      ).subscribe(() => {
        ProgressDialog.close();
        observer.next();
      });
    });

  }

  public getMessageIdFromDocId(documentId: any): number {
    return parseInt(this.api.getDocumentData(documentId).split('\t')[0].match(/[0-9]+/)[0], 10);
  }

  public downloadIndexFromServer(): Observable<boolean> {
    clearTimeout(this.indexUpdateIntervalId);
    this.notifyOnNewMessages = false; // we don't want notification on first message update after index load
    this.init();

    return this.initSubject.pipe(
        mergeMap(() => this.checkIfDownloadableIndexExists()),
        mergeMap((res) => new Observable<boolean>( (observer) => {
        if (!res) {
          this.api.initXapianIndex(XAPIAN_GLASS_WR);
          this.localSearchActivated = true;
          this.indexLastUpdateTime = 0;
          this.updateIndexWithNewChanges();
          observer.next(true);
          return;
        }

        console.log('Download index');

        this.downloadProgress = 0;
        let loaded = 0;

        const downloadAndWriteFile = (filename: string, fileno: number): Observable<void> => {
          return this.httpclient.request(
            new HttpRequest<any>('GET', '/mail/download_xapian_index?fileno=' + fileno,
            {responseType: 'arraybuffer', reportProgress: true}
          )).pipe(
            map(event => {
              if (event.type === HttpEventType.DownloadProgress) {
                  const progress = ((loaded + event.loaded) * 100 / this.serverIndexSizeUncompressed);
                  this.downloadProgress = progress === 100 ? null : progress;
              } else if (event.type === HttpEventType.Response) {
                const data = new Uint8Array(event.body as ArrayBuffer);
                FS.writeFile('xapianglasswr/' + filename, data, { encoding: 'binary' });
                loaded += data.length;
              }
              return event;
            }),
            filter(event => event.type === HttpEventType.Response),
            map(event => {
              console.log('download complete for', filename, fileno);
            })
          );
        };

        if (this.localSearchActivated) {
          this.api.closeXapianDatabase();
        }
        try {
          FS.stat(XAPIAN_GLASS_WR);
        } catch (e) {
          FS.mkdir(XAPIAN_GLASS_WR);
        }

        downloadAndWriteFile('iamglass', 1).pipe(
          mergeMap(() => downloadAndWriteFile('docdata.glass', 2)),
          mergeMap(() => downloadAndWriteFile('termlist.glass', 3)),
          mergeMap(() => downloadAndWriteFile('postlist.glass', 4)),
        ).subscribe(() => {
            this.api.initXapianIndex(XAPIAN_GLASS_WR);
            console.log(this.api.getXapianDocCount() + ' docs in Xapian database');
            this.localSearchActivated = true;

            this.updateIndexLastUpdateTime();

            this.downloadProgress = null;
            observer.next(true);
          });
      })));
  }

  postMessagesToXapianWorker(newMessagesToProcess: SearchIndexDocumentUpdate[]): Observable<any> {
    if (!this.localSearchActivated) {
      return of();
    }

    if (!this.pendingMessagesToProcess) {
      this.pendingMessagesToProcess = newMessagesToProcess;
      this.messageProcessingInProgressSubject = new AsyncSubject();

      const getProgressSnackBarMessageText = () => `Syncing ${this.processMessageIndex} / ${this.pendingMessagesToProcess.length}`;
      let progressSnackBar: MatSnackBarRef<SyncProgressComponent>;
      if (this.pendingMessagesToProcess.length > 10) {
        progressSnackBar = this.snackbar.openFromComponent(SyncProgressComponent);
        progressSnackBar.instance.messagetextsubject.next(getProgressSnackBarMessageText());
      }

      const processMessage = async () => {
        if (!this.localSearchActivated) {
          // Handle that index is deleted in the middle of an indexing process
          this.messageProcessingInProgressSubject.error('Search index deleted in the middle of indexing process');
          return;
        } else if (this.processMessageIndex < this.pendingMessagesToProcess.length) {
          this.processMessageHistoryProgress = Math.round(this.processMessageIndex * 100 / this.pendingMessagesToProcess.length);

          console.log('Adding to index', (this.pendingMessagesToProcess.length - this.processMessageIndex), 'to go');
          if (progressSnackBar) {
            progressSnackBar.instance.messagetextsubject.next(getProgressSnackBarMessageText());
          }

          this.rmmapi.deleteFromMessageContentsCache(this.pendingMessagesToProcess[this.processMessageIndex].id);

          const nextMessage = this.pendingMessagesToProcess[this.processMessageIndex++];
          await nextMessage.updateFunction();

          if (this.persistIndexInProgressSubject) {
            // Wait for persistence of index to finish before doing more work on the index
            await this.persistIndexInProgressSubject.toPromise();
          }
          setTimeout(() => processMessage(), 1);

        } else {
          console.log('All messages added');
          this.api.commitXapianUpdates();

          if (progressSnackBar) {
            progressSnackBar.dismiss();
          }
          this.processMessageHistoryProgress = null;
          this.pendingMessagesToProcess = null;
          if (this.processMessageIndex > 0) {
            this.processMessageIndex = 0;
            this.indexNotPersisted = true;
          }

          this.messageProcessingInProgressSubject.next(true);
          this.messageProcessingInProgressSubject.complete();
          this.messageProcessingInProgressSubject = null;

          this.searchResultsSubject.next();
        }
      };
      if (this.persistIndexInProgressSubject) {
        // Wait for persistence of index to finish before doing more work on the index
        this.persistIndexInProgressSubject.subscribe(() => processMessage());
      } else {
        processMessage();
      }
    } else {
      this.pendingMessagesToProcess = this.pendingMessagesToProcess.concat(newMessagesToProcess);
    }
    return this.messageProcessingInProgressSubject;

  }

  persistIndex(): Observable<boolean> {
    if (!this.indexNotPersisted || !this.localSearchActivated) {
      return of(false);
    } else {
      if (!this.persistIndexInProgressSubject) {
        this.persistIndexInProgressSubject = new AsyncSubject();

        console.log('Persisting to indexeddb');

        FS.writeFile('indexLastUpdateTime', '' + this.indexLastUpdateTime, { encoding: 'utf8' });
        FS.syncfs(false, () => {
            this.persistIndexInProgressSubject.next(true);
            this.persistIndexInProgressSubject.complete();
            this.persistIndexInProgressSubject = null;
            this.indexNotPersisted = false;
            console.log('Done persisting to indexeddb');
        });
      }
      return this.persistIndexInProgressSubject;
    }
  }

  /**
   * Move messages instantly in the local index (this does not affect server,
   * so the server must also be updated separately)
   * @param messageIds
   * @param destinationfolderPath
   */
  moveMessagesToFolder(messageIds: number[], destinationfolderPath: string) {
    this.messagelistservice.folderCountSubject
      .pipe(take(1))
      .subscribe((folders) => {
        const destinationFolder = folders.find(folder => folder.folderPath === destinationfolderPath);

        if (destinationFolder.folderType === 'spam' || destinationFolder.folderType === 'trash') {
          this.postMessagesToXapianWorker(messageIds.map(mid =>
              new SearchIndexDocumentUpdate(mid, () => {
                try {
                  this.api.deleteDocumentByUniqueTerm('Q' + mid);
                  console.log('Deleted msg id search index', mid);
                } catch (e) {
                  console.error('Unable to delete message from search index (not found?)', mid);
                }
              })
            )
          );
        } else {
          const dotSeparatedDestinationfolderPath = destinationfolderPath.replace(/\//g, '.');
          this.postMessagesToXapianWorker(messageIds.map(mid =>
              new SearchIndexDocumentUpdate(mid, () => {
                try {
                  this.api.changeDocumentsFolder('Q' + mid, dotSeparatedDestinationfolderPath);
                } catch (e) {
                  console.error('Unable to change index document folder', mid, dotSeparatedDestinationfolderPath,
                    '(not found since moving from trash/spam folder?');
                }
              })
            )
          );
        }
    });
  }

  /**
   * Delete messages instantly from the local index ( does not affect server )
   */
  deleteMessages(messageIds: number[]) {
    if (!this.api) {
      return;
    }
    this.postMessagesToXapianWorker(messageIds.map(mid =>
          new SearchIndexDocumentUpdate(mid, () =>
            this.api.deleteDocumentByUniqueTerm('Q' + mid)
          )
        )
    );
  }

  getFolderQuery(querytext: string, folderPath: string, unreadOnly: boolean): string {
    const folderQuery = (folderName) => 'folder:"' + folderName.replace(/\//g, '\.') + '" ';

    if (folderPath === 'Inbox') {
      // Workaround for IMAP setting folder to "INBOX" when moving messages  there
      querytext += `(${folderQuery('Inbox')} OR ${folderQuery('INBOX')})`;
    } else {
      querytext += folderQuery(folderPath);
    }

    if (unreadOnly) {
      querytext += ' AND NOT flag:seen';
    }
    return querytext;
  }

  /**
   * Polling loop (every 10th sec)
   */
  async updateIndexWithNewChanges() {
    clearTimeout(this.indexUpdateIntervalId);

    await this.persistIndex().toPromise();

    console.log('Getting latest messages from server after', new Date(this.indexLastUpdateTime));

    try {
      const pendingIndexVerificationsArray = Object.keys(this.pendingIndexVerifications)
                    .map(idstring => {
                      const msgobj = this.pendingIndexVerifications[idstring];
                      return {
                        id: parseInt(msgobj.id.substring(1), 10),
                        flagged: msgobj.flagged ? 1 : 0,
                        seen: msgobj.seen ? 1 : 0,
                        answered: msgobj.answered ? 1 : 0,
                        deleted: msgobj.deleted ? 1 : 0,
                        folder: msgobj.folder
                      };
                    }
        );

      this.pendingIndexVerifications = {};

      if (pendingIndexVerificationsArray.length > 0) {
        await this.httpclient.post('/rest/v1/searchindex/verifymessages',
            {
              indexEntriesToVerify: pendingIndexVerificationsArray
            }
        ).toPromise();
      }

      let msginfos = await this.rmmapi.listAllMessages(0, 0, this.indexLastUpdateTime,
            RunboxWebmailAPI.LIST_ALL_MESSAGES_CHUNK_SIZE,
            true).toPromise();

      if (this.localSearchActivated) {
        if (this.numberOfMessagesSyncedLastTime === 0) {
          // nothing else to do, check for folder count discrepancies

          const MAX_DISCREPANCY_CHECK_LIMIT = 50000; // Unable to check discrepancies for folders with more than 50K messages

          const currentFolder = (await this.messagelistservice.folderCountSubject.pipe(take(1)).toPromise())
                .find(folder => folder.folderPath === this.messagelistservice.currentFolder);

          const indexFolderResults = this.api.sortedXapianQuery(
              this.getFolderQuery('', currentFolder.folderPath, false), 0, 0, 0, MAX_DISCREPANCY_CHECK_LIMIT, -1);

          const numberOfMessages = indexFolderResults.length;
          const numberOfUnreadMessages = this.api.sortedXapianQuery(
                this.getFolderQuery('', currentFolder.folderPath, true), 0, 0, 0, MAX_DISCREPANCY_CHECK_LIMIT, -1).length;
          if (
            numberOfMessages < MAX_DISCREPANCY_CHECK_LIMIT &&
            currentFolder.totalMessages < MAX_DISCREPANCY_CHECK_LIMIT &&
            (!this.folderCountDiscrepanciesCheckedCount[currentFolder.folderPath] ||
            this.folderCountDiscrepanciesCheckedCount[currentFolder.folderPath] <= 3) && (
                numberOfMessages !== currentFolder.totalMessages ||
                numberOfUnreadMessages !== currentFolder.newMessages
              )
            ) {
            console.log(`number of messages
                (${numberOfMessages} vs ${currentFolder.totalMessages} and
                (${numberOfUnreadMessages} vs ${currentFolder.newMessages})
                  not matching with index for current folder`);

            if (this.folderCountDiscrepanciesCheckedCount[currentFolder.folderPath] >= 1) {
              this.folderCountDiscrepanciesCheckedCount[currentFolder.folderPath]++;

              if (this.folderCountDiscrepanciesCheckedCount[currentFolder.folderPath] === 3) {
                this.dialog.open(InfoDialog, {data: new InfoParams(
                  `Message count mismatch in folder ${currentFolder.folderName}`,
                  `<p>Your local search index is not in sync for folder ${currentFolder.folderName}.
                  Number of messages are ${numberOfMessages} but the search index has got ${currentFolder.totalMessages} and
                  ${numberOfUnreadMessages} unread messages vs ${currentFolder.newMessages} in the search index.</p>
                  <p>An attempt has already been made to correct this automatically without success, so you
                  should consider downloading a new search index from the server. Click
                  "Stop Synchronizing" in the left side menu, wait for confirmation, and then you can
                  reload and click "Start synchronizing" to download a fresh index.</p>
                  `)
                });
              }
            } else {
              // Only check folder discrepancies once per folder
              this.folderCountDiscrepanciesCheckedCount[currentFolder.folderPath] = 1;

              const folderMessages = await this.rmmapi.listAllMessages(0, 0, 0,
                MAX_DISCREPANCY_CHECK_LIMIT,
                true, currentFolder.folderPath).toPromise();
              msginfos = msginfos.concat(folderMessages);

              const folderMessageIDS: {[messageId: number]: boolean} = {};
              folderMessages.forEach(msg => folderMessageIDS[msg.id] = true);

              indexFolderResults.forEach((searchResultRow: number[]) => {
                  const docdataparts = this.api.getDocumentData(searchResultRow[0]).split('\t');
                  const rmmMessageId = parseInt(docdataparts[0].substring(1), 10);

                  if (!folderMessageIDS[rmmMessageId]) {
                    /*
                     * For messages present in the index but not in the server folder list, request index verification from the server -
                     * which means that the server either will update the changed_date timestamp of the message, or the deleted timestamp
                     * if the message was deleted.
                     */
                    this.pendingIndexVerifications[rmmMessageId] = {
                      id: docdataparts[0],
                      folder: currentFolder.folderPath
                    } as SearchIndexDocumentData;
                  }
              });
            }
          }
        }
        const searchIndexDocumentUpdates: SearchIndexDocumentUpdate[] = [];

        const deletedMessages = await this.rmmapi.listDeletedMessagesSince(new Date(
              // Subtract timezone offset to get UTC
              this.indexLastUpdateTime - new Date().getTimezoneOffset() * 60 * 1000)
            ).toPromise();

        deletedMessages.forEach(msgid => {
          const uniqueIdTerm = `Q${msgid}`;
          const docid = this.api.getDocIdFromUniqueIdTerm(uniqueIdTerm);
          if (docid !== 0) {
            searchIndexDocumentUpdates.push(
              new SearchIndexDocumentUpdate(msgid, async () => {
                try {
                  this.api.deleteDocumentByUniqueTerm(uniqueIdTerm);
                } catch (e) {
                  console.error('Unable to delete message from index', msgid);
                }
              })
            );
          }
        });

        const folders = await this.messagelistservice.folderCountSubject.pipe(take(1)).toPromise();

        msginfos.forEach(msginfo => {
            const uniqueIdTerm = `Q${msginfo.id}`;
            const docid = this.api.getDocIdFromUniqueIdTerm(uniqueIdTerm);
            if (
              docid === 0 && // document not found in the index
              msginfo.folder !== this.messagelistservice.spamFolderName &&
              msginfo.folder !== this.messagelistservice.trashFolderName
            ) {
              searchIndexDocumentUpdates.push(
                new SearchIndexDocumentUpdate(msginfo.id, async () => {
                  try {
                    this.indexingTools.addMessageToIndex(msginfo, [
                      this.messagelistservice.spamFolderName,
                      this.messagelistservice.trashFolderName
                    ]);
                    // Add term about missing body text so that later stage can add this
                    this.api.addTermToDocument(`Q${msginfo.id}`, XAPIAN_TERM_MISSING_BODY_TEXT);
                    if (msginfo.deletedFlag) {
                      this.api.addTermToDocument(`Q${msginfo.id}`, XAPIAN_TERM_DELETED);
                    }
                  } catch (e) {
                    console.error('failed to add message to index', msginfo, e);
                  }
                })
              );
            } else if (docid !== 0) {
              this.api.documentXTermList(docid);
              const messageStatusInIndex = {
                flagged: false,
                seen: false,
                answered: false,
                deleted: false
              };
              const documentTermList = (Module.documenttermlistresult as string[]);
              const addSearchIndexDocumentUpdate = (func: () => void) =>
                searchIndexDocumentUpdates.push(
                  new SearchIndexDocumentUpdate(msginfo.id, async () => {
                    try {
                      func();
                    } catch (err) {
                      console.error('Error updating doc in searchindex', msginfo, documentTermList, err);
                    }
                  }
                  )
                );
              documentTermList.forEach(term => {
                if (term.indexOf(XAPIAN_TERM_FOLDER) === 0 &&
                  term.substr(XAPIAN_TERM_FOLDER.length) !== msginfo.folder) {
                    // Folder changed
                    const destinationFolder = folders.find(folder => folder.folderPath === msginfo.folder);
                    if (destinationFolder && (destinationFolder.folderType === 'spam' || destinationFolder.folderType === 'trash')) {
                      addSearchIndexDocumentUpdate(() => this.api.deleteDocumentByUniqueTerm(uniqueIdTerm));
                    } else {
                      addSearchIndexDocumentUpdate(() => this.api.changeDocumentsFolder(uniqueIdTerm, msginfo.folder));
                    }
                } else if (term === XAPIAN_TERM_FLAGGED) {
                  messageStatusInIndex.flagged = true;
                } else if (term === XAPIAN_TERM_SEEN) {
                  messageStatusInIndex.seen = true;
                } else if (term === XAPIAN_TERM_ANSWERED) {
                  messageStatusInIndex.answered = true;
                } else if (term === XAPIAN_TERM_DELETED) {
                  messageStatusInIndex.deleted = true;
                }
              });

              if (msginfo.answeredFlag && !messageStatusInIndex.answered) {
                addSearchIndexDocumentUpdate(() =>
                  this.api.addTermToDocument(uniqueIdTerm, XAPIAN_TERM_ANSWERED));
              } else if (!msginfo.answeredFlag && messageStatusInIndex.answered) {
                addSearchIndexDocumentUpdate(() =>
                  this.api.removeTermFromDocument(uniqueIdTerm, XAPIAN_TERM_ANSWERED));
              }

              if (msginfo.flaggedFlag && !messageStatusInIndex.flagged) {
                addSearchIndexDocumentUpdate(() =>
                  this.api.addTermToDocument(uniqueIdTerm, XAPIAN_TERM_FLAGGED));
              } else if (!msginfo.flaggedFlag && messageStatusInIndex.flagged) {
                addSearchIndexDocumentUpdate(() =>
                  this.api.removeTermFromDocument(uniqueIdTerm, XAPIAN_TERM_FLAGGED));
              }

              if (msginfo.seenFlag && !messageStatusInIndex.seen) {
                addSearchIndexDocumentUpdate(() =>
                  this.api.addTermToDocument(uniqueIdTerm, XAPIAN_TERM_SEEN));
              } else if (!msginfo.seenFlag && messageStatusInIndex.seen) {
                addSearchIndexDocumentUpdate(() =>
                  this.api.removeTermFromDocument(uniqueIdTerm, XAPIAN_TERM_SEEN));
              }

              if (msginfo.deletedFlag && !messageStatusInIndex.deleted) {
                addSearchIndexDocumentUpdate(() =>
                  this.api.addTermToDocument(uniqueIdTerm, XAPIAN_TERM_DELETED));
              } else if (!msginfo.deletedFlag && messageStatusInIndex.deleted) {
                addSearchIndexDocumentUpdate(() =>
                  this.api.removeTermFromDocument(uniqueIdTerm, XAPIAN_TERM_DELETED));
              }
            }
          });

          this.numberOfMessagesSyncedLastTime = searchIndexDocumentUpdates.length;

          if (searchIndexDocumentUpdates.length > 0) {
            await this.postMessagesToXapianWorker(searchIndexDocumentUpdates).toPromise();
          }

          // Look up messages with missing body text term and add the missing text to the index
          const messagesMissingBodyText = this.api.sortedXapianQuery('flag:missingbodytext', 0, 0, 0, 10, -1);
          if (messagesMissingBodyText.length > 0) {
            await this.postMessagesToXapianWorker(messagesMissingBodyText.map(searchIndexEntry => {
              const messageId = parseInt(this.api.getDocumentData(searchIndexEntry[0]).split('\t')[0].substring(1), 10);

              return new SearchIndexDocumentUpdate(messageId, async () => {
                try {
                  const docIdTerm = `Q${messageId}`;
                  const messageText = (await this.rmmapi.getMessageContents(messageId).toPromise()).text.text;
                  this.api.addTextToDocument(docIdTerm, true, messageText);
                  this.api.removeTermFromDocument(docIdTerm, XAPIAN_TERM_MISSING_BODY_TEXT);
                } catch (e) {
                  console.error('Failed to add text to document', messageId, e);
                }
              });
            })).toPromise();
          }
        }

        if (msginfos && msginfos.length > 0) {
          // Notify on new messages
          this.messagelistservice.applyChanges(msginfos);

          if (this.notifyOnNewMessages && 'Notification' in window &&
              window['Notification']['permission'] === 'granted') {
            const newmessages = msginfos.filter(m =>
                !m.seenFlag &&
                m.folder === 'Inbox' &&
                m.messageDate.getTime() > this.indexLastUpdateTime);
            if (newmessages.length > 0) {
              const newMessagesTitle = newmessages.length > 1 ?
                  `${newmessages.length} new email messages` :
                  `New email message`;
              try {
                // tslint:disable-next-line:no-unused-expression
                  const notification = new Notification(newMessagesTitle, {
                    body: newmessages[0].from[0].name,
                    icon: 'assets/icons/icon-192x192.png',
                    tag: 'newmessages'
                  });
              } catch (e) {
                console.log('Should have displayed notification about new messages:', newMessagesTitle);
              }
            }
          }
          // Find latest date in result set and use as since parameter for getting new changes from server

          let newLastUpdateTime = 0;
          msginfos.forEach(msginfo => {
            if (msginfo.changedDate && msginfo.changedDate.getTime() > newLastUpdateTime) {
              newLastUpdateTime = msginfo.changedDate.getTime();
            }
            if (msginfo.messageDate && msginfo.messageDate.getTime() > newLastUpdateTime) {
              newLastUpdateTime = msginfo.messageDate.getTime();
            }
          });
          if (newLastUpdateTime > this.indexLastUpdateTime) {
            this.indexLastUpdateTime = newLastUpdateTime;
          }
        }
      } catch (err) {
        console.error('Failed updating with new changes (will retry in 10 secs)', err);
      }
      this.notifyOnNewMessages = true;
      this.indexUpdateIntervalId = setTimeout(() => this.updateIndexWithNewChanges(), 10000);
    }

    checkIfDownloadableIndexExists(): Observable<boolean> {
      return this.httpclient.get('/mail/download_xapian_index?exists=check').pipe(
            map((stat: any) => {
              this.serverIndexSize = stat.size;
              this.serverIndexSizeUncompressed = stat.uncompressedsize;
              console.log('Downloadable index exists: ' + stat.exists);
              return stat.exists;
            })
          );
    }

    downloadPartitions(): Observable<any> {
      let totalSize;
      let totalCompressedSize;
      let partitions: DownloadablePartition[];
      let userHasAcceptedDownloadAllPartitions = false;
      return this.httpclient.get('/rest/v1/searchindex/partitions')
        .pipe(
          catchError(() =>
            of(new DownloadableSearchIndexMap())
          ),
          map((searchindexmap: DownloadableSearchIndexMap) => {
            partitions = searchindexmap.partitions.filter((p, ndx) => ndx > 0);
            totalSize = partitions.reduce((prev, curr) => prev +
              curr.files.reduce((p, c) => c.uncompressedsize + p, 0), 0);
            totalCompressedSize  = partitions.reduce((prev, curr) => prev +
              curr.files.reduce((p, c) => c.compressedsize + p, 0), 0);
            if (totalSize === 0) {
              console.log('No extra search index partitions');
              this.updateIndexWithNewChanges();
            }
            return totalSize;
          }),
          filter(() => totalSize > 0),
          mergeMap(() => {
            this.partitionDownloadProgress = 0;

            const confirmDownloadPartition = (ndx) =>
              new Observable(observer => {
                if (ndx === 1 && !userHasAcceptedDownloadAllPartitions) {
                  // Always download first partition, but ask for confirmation for the remaining
                  const dialog = this.dialog.open(ConfirmDialog);
                  const doccount = this.api.getXapianDocCount();
                  const remainingDownloadMB = Math.round(
                      partitions.reduce((prev, curr, partitionNdx) => prev +
                          (partitionNdx < 1 ? 0 :
                            curr.files.reduce((p, c) => c.compressedsize + p, 0)
                          ),
                        0)
                        / (1024 * 1024)
                      );
                  const totalMessages = partitions.reduce((prev, curr, partitionNdx) => prev +
                        curr.numberOfMessages,
                        0);

                  dialog.componentInstance.title = 'Continue synchronizing?';
                  dialog.componentInstance.question = `Already synchronized index for
                      ${doccount} of
                      your most recent messages. To synchronize entire index
                      (for ${totalMessages} messages),
                      there's an additional download of ${remainingDownloadMB} MB.`;
                  dialog.afterClosed()
                    .subscribe(res => {
                      userHasAcceptedDownloadAllPartitions = res;
                      observer.next(userHasAcceptedDownloadAllPartitions);
                    });
                } else {
                  observer.next(ndx === 0 || userHasAcceptedDownloadAllPartitions);
                }
            });


            const downloadPartition = (p: DownloadablePartition, ndx): Observable<boolean> => {
              let currentFileIndex = 0;
              return from(p.files.map((file) =>
                  this.httpclient.request(
                    new HttpRequest('GET',
                      `/rest/v1/searchindex/file/${p.folder}/${file.filename}`, {
                        reportProgress: true,
                        responseType: 'arraybuffer'
                      }
                    )
                  )
                )
              ).pipe(
                mergeMap(req =>
                  req.pipe(
                    map((event) => {
                      if (event.type === HttpEventType.DownloadProgress) {
                        p.files[currentFileIndex].downloaded = event.loaded;
                        this.partitionDownloadProgress = partitions.reduce((prev, curr) =>
                          prev + curr.files.reduce((pr, cu) =>
                            pr + (cu.downloaded !== undefined ? cu.downloaded : 0), 0), 0) / totalSize;
                      }
                      return event;
                    }),
                    filter((event) => event instanceof HttpResponse),
                    map((event) => {
                        currentFileIndex++;
                        const response = event as HttpResponse<ArrayBuffer>;
                        console.log(response.url);
                        const data = new Uint8Array(response.body);
                        const dirname = p.folder;

                        try {
                          FS.stat(`${this.partitionsdir}/${dirname}`);
                        } catch (e) {
                          FS.mkdir(`${this.partitionsdir}/${dirname}`);
                        }

                        const filename = response.url.substring(response.url.lastIndexOf('/') + 1);
                        FS.writeFile(`${this.partitionsdir}/${dirname}/${filename}`, data, { encoding: 'binary' });
                        return true;
                      }
                    ),
                    take(1)
                  ), 1
                ),
                bufferCount(p.files.length),
                tap(() => {
                  console.log(`Opening partition ${p.folder}`);
                  this.api.addFolderXapianIndex(`${this.partitionsdir}/${p.folder}`);
                  this.searchResultsSubject.next();
                }),
                map(() => true)
              );
            };

            return from(partitions.map((p, ndx) =>
              confirmDownloadPartition(ndx).pipe(
                  mergeMap(res => res === true ? downloadPartition(p, ndx) : of(false))
              ))).pipe(
                mergeMap((o: Observable<any>) => o.pipe(take(1)), 1),
                bufferCount(partitions.length)
              );
          })
        ).pipe(
          tap(() => {
            this.partitionDownloadProgress = null;
            this.updateIndexWithNewChanges();
          })
        );
    }

    /**
     * Look up document data from the database. If the id is the same as from the previous request, it will use
     * the previous lookup result, otherwise look up from the database with the new id
     * 
     * @param docid the id of the document in the Xapian database (NOT the same as the RMM message id)
     */
    public getDocData (docid: number): SearchIndexDocumentData {
        if (docid !== this.currentXapianDocId) {
          const docdataparts = this.api.getDocumentData(docid).split('\t');

          this.currentDocData = {
            id: docdataparts[0],
            from: docdataparts[1],
            subject: docdataparts[2],
            recipients: '',
            textcontent: null
          };

          const rmmMessageId = parseInt(this.currentDocData.id.substring(1), 10);
          const rmmCachedMessageContent = this.rmmapi.messageContentsCache[rmmMessageId];
          if (rmmCachedMessageContent) {
            rmmCachedMessageContent.subscribe(content =>
              this.currentDocData.textcontent = content.text.text);
          }

          this.api.documentXTermList(docid);
          (Module.documenttermlistresult as string[])
              .forEach(s => {
                if (s.indexOf(XAPIAN_TERM_FOLDER) === 0) {
                  this.currentDocData.folder = s.substr(XAPIAN_TERM_FOLDER.length);
                } else if (s === XAPIAN_TERM_FLAGGED) {
                  this.currentDocData.flagged = true;
                } else if (s === XAPIAN_TERM_SEEN) {
                  this.currentDocData.seen = true;
                } else if (s === XAPIAN_TERM_ANSWERED) {
                  this.currentDocData.answered = true;
                } else if (s === XAPIAN_TERM_DELETED) {
                  this.currentDocData.deleted = true;
                } else if (s === 'XFattachment') {
                  this.currentDocData.attachment = true;
                } else if (s.indexOf('XRECIPIENT') === 0) {
                  const recipient = s.substring('XRECIPIENT:'.length);
                  if (this.currentDocData.recipients) {
                    this.currentDocData.recipients += (', ' + recipient);
                  } else {
                    this.currentDocData.recipients = recipient;
                  }
                }
              });
          this.currentXapianDocId = docid;

          if (!this.pendingIndexVerifications[this.currentDocData.id]) {
            if (this.currentDocData.folder === 'Sent' && !this.currentDocData.recipients) {
              this.currentDocData.folder = 'Sent '; // Force updating index to add recipient term
            }
            this.pendingIndexVerifications[this.currentDocData.id] = this.currentDocData;
          }
        }
        return this.currentDocData;
    }

    public getCanvasTableColumns(app: AppComponent): CanvasTableColumn[] {
      const columns: CanvasTableColumn[] = [
              {
                  sortColumn: null,
                  name: '',
                  rowWrapModeHidden: false,
                  getValue: (rowobj): any => app.isSelectedRow(rowobj),
                  checkbox: true,
                  width: 38
            },
            {
              name: 'Date',
              sortColumn: 2,
              rowWrapModeMuted : true,
              getValue: (rowobj): string => {
                const datestring = this.api.getStringValue(rowobj[0], 2);
                return MessageTableRowTool.formatTimestampFromStringWithoutSeparators(datestring);
              },
              width: app.canvastablecontainer.getSavedColumnWidth(1, 110)
            },
            (app.selectedFolder.indexOf('Sent') === 0 && !app.displayFolderColumn) ? {
              name: 'To',
              sortColumn: null,
              getValue: (rowobj): string => this.getDocData(rowobj[0]).recipients,
              width:  app.canvastablecontainer.getSavedColumnWidth(2, 300)
            } :
            {
              name: 'From',
              sortColumn: 0,
              getValue: (rowobj): string => {
                return this.getDocData(rowobj[0]).from;
              },
              width:  app.canvastablecontainer.getSavedColumnWidth(2, 300)
            },
            {
              name: 'Subject',
              sortColumn: 1,
              getValue: (rowobj): string => {
                return this.getDocData(rowobj[0]).subject;
              },
              width:  app.canvastablecontainer.getSavedColumnWidth(3, 300),
              draggable: true,
              getContentPreviewText: (rowobj): string => {
                const ret = this.getDocData(rowobj[0]).textcontent;
                return ret ? ret.trim() : '';
              },
              // tooltipText: 'Tip: Drag subject to a folder to move message(s)'
            }
        ];

        if (app.viewmode === 'conversations') {
          // Array containing row (conversation) objects waiting to be counted
          let currentCountObject = null;

          const processCurrentCountObject = () => {
            // Function for counting messages in a conversation
            const rowobj = currentCountObject;
            const conversationId = this.api.getStringValue(rowobj[0], 1);
            this.api.setStringValueRange(1, 'conversation:');
            const conversationSearchText = `conversation:${conversationId}..${conversationId}`;
            const results = this.api.sortedXapianQuery(
              conversationSearchText,
              1, 0, 0, 1000, 1
            );
            this.api.clearValueRange();
            rowobj[2] = `${results[0][1] + 1}`;

            currentCountObject = null;
          };

          columns.push(
            {
              name: 'Count',
              sortColumn: null,
              rowWrapModeChipCounter: true,
              getValue: (rowobj): string => {
                if (!rowobj[2]) {
                  if (currentCountObject === null) {
                    currentCountObject = rowobj;
                    setTimeout(() => processCurrentCountObject(), 0);
                  }
                  return 'RETRY';
                } else {
                  return rowobj[2];
                }
              },
              textAlign: 1,
              width:  app.canvastablecontainer.getSavedColumnWidth(4, 80)
            });
        } else {
          columns.push(
            {
              sortColumn: 3,
              name: 'Size',
              rowWrapModeHidden: true,
              textAlign: 1,
              getValue: (rowobj): string => {
                return  `${this.api.getNumericValue(rowobj[0], 3)}`;
              },
              getFormattedValue: (val) => val === '-1' ? '\u267B' : MessageTableRowTool.formatBytes(val),
              width: app.canvastablecontainer.getSavedColumnWidth(4, 80),
              tooltipText: (rowobj) => this.api.getNumericValue(rowobj[0], 3) === -1 ?
                          'This message is marked for deletion by an IMAP client' : null
            });

          columns.push({
              sortColumn: null,
              name: '',
              textAlign: 2,
              rowWrapModeHidden: true,
              font: '16px \'Material Icons\'',
              getValue: (rowobj: MessageInfo): boolean => this.getDocData(rowobj[0]).attachment ? true : false,
              width: 35,
              getFormattedValue: (val) => val ? '\uE226' : ''
          });
          columns.push({
              sortColumn: null,
              name: '',
              textAlign: 2,
              rowWrapModeHidden: true,
              font: '16px \'Material Icons\'',
              getValue: (rowobj: MessageInfo): boolean => this.getDocData(rowobj[0]).answered ? true : false,
              width: 35,
              getFormattedValue: (val) => val ? '\uE15E' : ''
          });
          columns.push({
              sortColumn: null,
              name: '',
              textAlign: 2,
              rowWrapModeHidden: true,
              font: '16px \'Material Icons\'',
              getValue: (rowobj: MessageInfo): boolean => this.getDocData(rowobj[0]).flagged ? true : false,
              width: 35,
              getFormattedValue: (val) => val ? '\uE153' : ''
          });

          if (app.displayFolderColumn) {
            columns.push({
              sortColumn: null,
              name: 'Folder',
              rowWrapModeHidden: true,
              getValue: (rowobj): string => this.getDocData(rowobj[0]).folder.replace(/\./g, '/'),
              width: 200
            });
          }

        }
        return columns;
    }
}

