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
import { Http, Response, ResponseContentType } from '@angular/http';
import { ProgressService} from '../http/progress.service';
import { Router } from '@angular/router';
import { Observable ,  AsyncSubject ,  BehaviorSubject ,  Subject ,  of, from  } from 'rxjs';
import { XapianAPI } from './rmmxapianapi';
import { RunboxWebmailAPI, RunboxMe } from '../rmmapi/rbwebmail';
import { MessageInfo,
    IndexingTools } from './messageinfo';
import { CanvasTableColumn} from '../canvastable/canvastable';
import { AppComponent } from '../app.component';
import { MessageTableRowTool} from '../messagetable/messagetablerow';
import { MatSnackBar, MatDialog, MatSnackBarRef } from '@angular/material';
import { InfoDialog, InfoParams} from '../dialog/info.dialog';
import { ProgressDialog } from '../dialog/progress.dialog';
import { MessageListService } from '../rmmapi/messagelist.service';
import { mergeMap, map, filter, finalize, catchError, tap, take, bufferCount } from 'rxjs/operators';
import { HttpClient, HttpRequest, HttpResponse, HttpEventType, HttpDownloadProgressEvent } from '@angular/common/http';
import { ConfirmDialog } from '../dialog/confirmdialog.component';
import { DownloadableSearchIndexMap, DownloadablePartition } from './downloadablesearchindexmap.class';
import { SyncProgressComponent } from './syncprogress.component';
import { xapianLoadedSubject } from './xapianwebloader';

declare var FS;
declare var IDBFS;
declare var Module;

export const XAPIAN_GLASS_WR = 'xapianglasswr';

@Injectable()
export class SearchService {

  public api: XapianAPI;

  public initSubject: AsyncSubject<any> = new AsyncSubject();
  public noLocalIndexFoundSubject: AsyncSubject<any> = new AsyncSubject();

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

  processedUpdatesMap = {};

  lowestindexid = 0;

  reloadXapianDataBaseInProgress = false;

  serverIndexSize = -1;
  serverIndexSizeUncompressed = -1;

  public folders: any[] = [];

  memindexdir = 'rmmmemoryindex';
  localdir: string;
  partitionsdir: string;

  workerStatusMessage: BehaviorSubject<string> = new BehaviorSubject(null);

  initcalled = false;
  partitionDownloadProgress: number = null;

  persistIndexInProgress = false;

  /**
   * Keep track of earlier change polls so that we don't reindex what we've already processed
   */
  pollCache: {[id: number]: MessageInfo} = {};

  /**
   * Extra per message verification of index contents to assure that it is in sync with the database
   * (workaround while waiting for deleted_messages support, but also a good extra check)
   */
  pendingIndexVerifications: {[id: string]: any} = {};

  constructor(public rmmapi: RunboxWebmailAPI,
       private router: Router,
       private http: Http,
       private httpclient: HttpClient,
       private ngZone: NgZone,
       private snackbar: MatSnackBar,
       private dialog: MatDialog,
       private progressService: ProgressService,
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
    this.rmmapi.markSeenSubject
      .pipe(
        mergeMap((msg) => this.postMessagesToXapianWorker([msg])),
        tap(() => {
          this.reloadDatabases();
        })
      )
      .subscribe();

    xapianLoadedSubject.subscribe(() => {
      this.workerStatusMessage.next('Checking if local search index exists');
      const initXapianFileSys = () => {
        this.api =  new XapianAPI();

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

            this.updateFolderInfo();

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
          this.pollCache = {};
          this.indexLastUpdateTime = 0;
          this.updateIndexWithNewChanges();
          observer.next(true);
          return;
        }

        console.log('Download index');

        this.downloadProgress = 0;
        let loaded = 0;
        const progressSubscription = this.progressService.downloadProgress.pipe(
            map((progress) => (loaded + progress.loaded) * 100 / this.serverIndexSizeUncompressed)
          ).subscribe((p) =>
              this.downloadProgress = p
          );

        const downloadAndWriteFile = (filename: string, fileno: number): Observable<void> => {
          return this.http.get('/mail/download_xapian_index?fileno=' + fileno,
            {responseType: ResponseContentType.ArrayBuffer}
          ).pipe(map(r => {
              const data = new Uint8Array(r.arrayBuffer());
              FS.writeFile('xapianglasswr/' + filename, data, { encoding: 'binary' });
              loaded += data.length;
            }));
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
            this.pollCache = {};
            this.updateFolderInfo();
            this.updateIndexLastUpdateTime();
            progressSubscription.unsubscribe();
            this.downloadProgress = null;
            observer.next(true);
          });
      })));
  }

  postMessagesToXapianWorker(messages: MessageInfo[]): Observable<any> {
    if (!this.localSearchActivated) {
      return new Observable(o => o.next());
    }

    return new Observable(observer => {
      // Test for indexing on main thread
      let processMessageIndex = 0;

      const indexingTools = new IndexingTools(this.api);
      const getProgressSnackBarMessageText = () => `Syncing ${processMessageIndex} / ${messages.length}`;
      let progressSnackBar: MatSnackBarRef<SyncProgressComponent>;
      if (messages.length > 10) {
        progressSnackBar = this.snackbar.openFromComponent(SyncProgressComponent);
        progressSnackBar.instance.messagetextsubject.next(getProgressSnackBarMessageText());
      }

      const processMessage = () => {
        if (!this.localSearchActivated) {
          // Handle that index is deleted in the middle of an indexing process
          observer.next();
        } else if (processMessageIndex < messages.length) {
          this.processMessageHistoryProgress = Math.round(processMessageIndex * 100 / messages.length);

          console.log('Adding to index', (messages.length - processMessageIndex), 'to go');
          if (progressSnackBar) {
            progressSnackBar.instance.messagetextsubject.next(getProgressSnackBarMessageText());
          }

          this.rmmapi.deleteFromMessageContentsCache(messages[processMessageIndex].id);

          indexingTools.addMessageToIndex(messages[processMessageIndex++], [
            this.messagelistservice.spamFolderName,
            this.messagelistservice.trashFolderName
          ]);
          setTimeout(() => processMessage(), 1);
        } else {
          console.log('All messages added');
          this.api.commitXapianUpdates();
          if (progressSnackBar) {
            progressSnackBar.dismiss();
          }
          this.processMessageHistoryProgress = null;
          // this.searchResultsSubject.next();
          observer.next();
        }
      };
      processMessage();
    });
  }

  reloadDatabases() {
    // console.log('Reloading databases - so that we get fresh search results');
    // this.api.closeXapianDatabase();
    // this.openStoredXapianDatabases();
    this.searchResultsSubject.next();
  }

  persistIndex(): Observable<boolean> {
    if (this.persistIndexInProgress || !this.localSearchActivated) {
      return new Observable(o => o.next(true));
    } else {
      this.persistIndexInProgress = true;

      this.reloadDatabases();

      console.log('Persisting to indexeddb - this may hang the app for few secs');
      return new Observable(observer => {
        FS.writeFile('indexLastUpdateTime', '' + this.indexLastUpdateTime, { encoding: 'utf8' });
        FS.syncfs(false, () => {
            this.persistIndexInProgress = false;
            observer.next(true);
            console.log('Done persisting to indexeddb');
        });
      });
    }
  }

  updateFolderInfo() {
    const folders = this.api.listFolders();
    this.api.listUnreadFolders().forEach((urfld) =>
        folders.find((fld) => urfld[0] === fld[0])[2] = urfld[1]
    );

    this.rmmapi.getFolderCount().subscribe(
        (folderEntries) =>
          this.folders = folderEntries.map((fld) => folders.find(folder => folder[0] === fld.folderName) ||
              [fld.folderName, fld.totalMessages, fld.newMessages
                , true // Folder is not in local index
              ]
            )
        );
  }

  /**
   * Move messages instantly in the local index (this does not affect server,
   * so the server must also be updated separately)
   * @param messageIds
   * @param destinationfolderPath
   */
  moveMessagesToFolder(messageIds: number[], destinationfolderPath: string) {
    this.messagelistservice.folderCountSubject
      .subscribe((folders) => {
        const destinationFolder = folders.find(folder => folder.folderPath === destinationfolderPath);

        if (destinationFolder.folderType === 'spam' || destinationFolder.folderType === 'trash') {
          messageIds.forEach(mid => {
            this.api.deleteDocumentByUniqueTerm('Q' + mid);
            console.log('Deleted msg id search index', mid);
          }
          );
        } else {
          const dotSeparatedDestinationfolderPath = destinationfolderPath.replace(/\//g, '.');
          messageIds.forEach(mid =>
            this.api.changeDocumentsFolder('Q' + mid, dotSeparatedDestinationfolderPath));
        }
        this.api.commitXapianUpdates();
        this.searchResultsSubject.next();
    });
  }

  /**
   * Delete messages instantly from the local index ( does not affect server )
   */
  deleteMessages(messageIds: number[]) {
    if (!this.api) {
      return;
    }
    messageIds.forEach(mid =>
      this.api.deleteDocumentByUniqueTerm('Q' + mid)
    );
    this.api.commitXapianUpdates();
    this.searchResultsSubject.next();
  }

  /**
   * Polling loop (every 10th sec)
   */
  updateIndexWithNewChanges() {
    clearTimeout(this.indexUpdateIntervalId);

    console.log('Getting latest messages from server after', new Date(this.indexLastUpdateTime));

    const pendingIndexVerificationsArray = Object.keys(this.pendingIndexVerifications)
                  .map(idstring => {
                    const msgobj = this.pendingIndexVerifications[idstring];
                    return {
                      id: parseInt(msgobj.id.substring(1), 10),
                      flagged: msgobj.flagged ? 1 : 0,
                      seen: msgobj.seen ? 1 : 0,
                      answered: msgobj.answered ? 1 : 0,
                      folder: msgobj.folder
                    };
                  }
      );

    this.pendingIndexVerifications = {};

    const verifyObservable = pendingIndexVerificationsArray.length > 0 ?
      this.httpclient.post('/rest/v1/searchindex/verifymessages',
          {
            indexEntriesToVerify: pendingIndexVerificationsArray
          }
      ) : of(true);

    verifyObservable.pipe(
      mergeMap(() =>
        this.rmmapi.listAllMessages(0, 0, this.indexLastUpdateTime,
          RunboxWebmailAPI.LIST_ALL_MESSAGES_CHUNK_SIZE,
          !this.localSearchActivated // Skip getting content if we are not using local search
        )
      ),
      // Concat deleted messages
      mergeMap(messages =>
        this.rmmapi.listDeletedMessagesSince(new Date(
              // Subtract timezone offset to get UTC
              this.indexLastUpdateTime - new Date().getTimezoneOffset() * 60 * 1000)
            )
          .pipe(map(deletedMessages => messages.concat(deletedMessages)))
      ),
      mergeMap(msginfos => {
        const unprocessed = msginfos
          .filter(msginfo =>
            this.pollCache[msginfo.id] === undefined ||
            !this.pollCache[msginfo.id].changedDate && msginfo.changedDate ||
            this.pollCache[msginfo.id].changedDate && !msginfo.changedDate ||
            (
              this.pollCache[msginfo.id].changedDate &&
              msginfo.changedDate &&
              this.pollCache[msginfo.id].changedDate.getTime() !==
              msginfo.changedDate.getTime()
            )
          );

        if (unprocessed.length === 0) {
          this.workerStatusMessage.next(null);
          console.log('No changes');

          this.indexUpdateIntervalId = setTimeout(() => this.updateIndexWithNewChanges(), 10000);
          this.notifyOnNewMessages = true;
          return of(unprocessed);
        }

        if (this.notifyOnNewMessages && 'Notification' in window &&
            window['Notification']['permission'] === 'granted') {
          const newmessages = unprocessed.filter(m =>
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

        this.indexLastUpdateTime = unprocessed[unprocessed.length - 1].changedDate ?
            unprocessed[unprocessed.length - 1].changedDate.getTime() :
            unprocessed[unprocessed.length - 1].messageDate.getTime();
        return this.postMessagesToXapianWorker(unprocessed)
                .pipe(
                  mergeMap(() =>
                    this.persistIndex()
                  ),
                  map(() => unprocessed)
                );
        }
      ), catchError((err) => {
        console.log('Other error', err);
        return of([] as MessageInfo[]);
      })).subscribe((unprocessed) => {
          this.messagelistservice.applyChanges(unprocessed);
          unprocessed.forEach(msginfo => this.pollCache[msginfo.id] = msginfo);
          this.notifyOnNewMessages = true;
          this.indexUpdateIntervalId = setTimeout(() => this.updateIndexWithNewChanges(), 10000);
      });
    }

    checkIfDownloadableIndexExists(): Observable<boolean> {
      return this.http.get('/mail/download_xapian_index?exists=check').pipe(
                      map((res: Response) => {
                        const stat = res.json();
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

    public getCanvasTableColumns(app: AppComponent): CanvasTableColumn[] {
      let currentDocId: number;
      let currentDocData: any;

      const getDocData: (docid: number) => any = (docid) => {
          if (docid !== currentDocId) {
            const docdataparts = this.api.getDocumentData(docid).split('\t');

            currentDocData = {
              id: docdataparts[0],
              from: docdataparts[1],
              subject: docdataparts[2],
              recipients: '',
              textcontent: null
            };

            this.rmmapi.getMessageContents(parseInt(currentDocData.id.substring(1), 10))
              .subscribe(contentobj => {
                currentDocData.textcontent = contentobj.text.text;
              });

            this.api.documentTermList(docid);
              (Module.documenttermlistresult as string[])
                .forEach(s => {
                  if (s.indexOf('XFOLDER:') === 0) {
                    currentDocData.folder = s.substr('XFOLDER:'.length);
                  } else if (s === 'XFflagged') {
                    currentDocData.flagged = true;
                  } else if (s === 'XFseen') {
                    currentDocData.seen = true;
                  } else if (s === 'XFanswered') {
                    currentDocData.answered = true;
                  } else if (s === 'XFattachment') {
                    currentDocData.attachment = true;
                  } else if (s.indexOf('XRECIPIENT') === 0) {
                    const recipient = s.substring('XRECIPIENT:'.length);
                    if (currentDocData.recipients) {
                      currentDocData.recipients += (', ' + recipient);
                    } else {
                      currentDocData.recipients = recipient;
                    }
                  }
                });
            currentDocId = docid;

            if (!this.pendingIndexVerifications[currentDocData.id]) {
              if (currentDocData.folder === 'Sent' && !currentDocData.recipients) {
                currentDocData.folder = 'Sent '; // Force updating index to add recipient term
              }
              this.pendingIndexVerifications[currentDocData.id] = currentDocData;
            }
          }
          return currentDocData;
      };

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
              getValue: (rowobj): string => getDocData(rowobj[0]).recipients,
              width:  app.canvastablecontainer.getSavedColumnWidth(2, 300)
            } :
            {
              name: 'From',
              sortColumn: 0,
              getValue: (rowobj): string => {
                return getDocData(rowobj[0]).from;
              },
              width:  app.canvastablecontainer.getSavedColumnWidth(2, 300)
            },
            {
              name: 'Subject',
              sortColumn: 1,
              getValue: (rowobj): string => {
                return getDocData(rowobj[0]).subject;
              },
              width:  app.canvastablecontainer.getSavedColumnWidth(3, 300),
              draggable: true,
              getContentPreviewText: (rowobj): string => {
                const ret = getDocData(rowobj[0]).textcontent;
                return ret ? ret.trim() : '';
              }
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
                return  '' + this.api.getNumericValue(rowobj[0], 3);
              },
              getFormattedValue: MessageTableRowTool.formatBytes,
              width: app.canvastablecontainer.getSavedColumnWidth(4, 80)
            });

          columns.push({
              sortColumn: null,
              name: '',
              textAlign: 2,
              rowWrapModeHidden: true,
              font: '16px \'Material Icons\'',
              getValue: (rowobj: MessageInfo): boolean => getDocData(rowobj[0]).attachment ? true : false,
              width: 35,
              getFormattedValue: (val) => val ? '\uE226' : ''
          });
          columns.push({
              sortColumn: null,
              name: '',
              textAlign: 2,
              rowWrapModeHidden: true,
              font: '16px \'Material Icons\'',
              getValue: (rowobj: MessageInfo): boolean => getDocData(rowobj[0]).answered ? true : false,
              width: 35,
              getFormattedValue: (val) => val ? '\uE15E' : ''
          });
          columns.push({
              sortColumn: null,
              name: '',
              textAlign: 2,
              rowWrapModeHidden: true,
              font: '16px \'Material Icons\'',
              getValue: (rowobj: MessageInfo): boolean => getDocData(rowobj[0]).flagged ? true : false,
              width: 35,
              getFormattedValue: (val) => val ? '\uE153' : ''
          });

          if (app.displayFolderColumn) {
            columns.push({
              sortColumn: null,
              name: 'Folder',
              rowWrapModeHidden: true,
              getValue: (rowobj): string => getDocData(rowobj[0]).folder.replace(/\./g, '/'),
              width: 200
            });
          }

        }
        return columns;
    }
}

