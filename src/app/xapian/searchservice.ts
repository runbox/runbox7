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

import { Inject, Injectable } from '@angular/core';
import { HttpClient, HttpRequest, HttpResponse, HttpEventType } from '@angular/common/http';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MatLegacySnackBar as MatSnackBar, MatLegacySnackBarRef as MatSnackBarRef } from '@angular/material/legacy-snack-bar';

import {
  AsyncSubject,
  BehaviorSubject,
  firstValueFrom,
  Observable,
  Subject,
  of,
  from,
  merge
} from 'rxjs';
import {
  mergeMap,
  map,
  filter,
  catchError,
  tap,
  take,
  takeUntil,
  bufferCount,
  distinctUntilChanged
} from 'rxjs/operators';

import { XapianAPI } from '@runboxcom/runbox-searchindex';
import { DownloadableSearchIndexMap, DownloadablePartition } from '@runboxcom/runbox-searchindex/downloadablesearchindexmap.class';
import { FolderListEntry } from '../common/folderlistentry';

import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { ProgressDialog } from '../dialog/progress.dialog';
import { MessageListService } from '../rmmapi/messagelist.service';
import { ConfirmDialog } from '../dialog/confirmdialog.component';
import { SyncProgressComponent } from './syncprogress.component';
import { xapianLoadedSubject } from './xapianwebloader';
import { PostMessageAction } from './messageactions';
import { objectEqualWithKeys } from '../common/util';
import { INDEX_WORKER_FACTORY, IndexWorkerFactory } from './index-worker.factory';
import { IndexWorkerClient } from './index-worker-client';
import { normalizeIndexManifest } from './index-sync-manifest';
import { canStartInitialSync } from './initial-sync-start-policy';
import { promoteHistoricalPartition } from './historical-partition-promotion';
import { closeIndexedDatabaseConnections } from './index-storage-cleanup';
import { rehydratePublishedIndexView } from './published-index-view';
import { IndexSyncOperation } from './index-sync-operation';
import {
  IndexSyncCoordinator,
  IndexSyncCoordinatorDependencies
} from './index-sync-coordinator';
import {
  IndexSyncState,
  NormalizedIndexManifest,
  NormalizedIndexPartition,
  RecentCatchUpCompleteEvent,
  RecentChunkCommittedEvent
} from './index-sync.types';

// eslint-disable-next-line no-var
declare var FS; declare var IDBFS; declare var Module;

const XAPIAN_TERM_FOLDER = 'XFOLDER:';
const XAPIAN_TERM_FLAGGED = 'XFflagged';
const XAPIAN_TERM_SEEN = 'XFseen';
const XAPIAN_TERM_ANSWERED = 'XFanswered';
const XAPIAN_TERM_DELETED = 'XFdeleted';
const XAPIAN_TERM_HASATTACHMENTS = 'XFattachment';

export const XAPIAN_GLASS_WR = 'xapianglasswr';

// FIXME: Also in index.worker.ts
export class SearchIndexDocumentData {
  id: string;
  from: string;
  subject: string;
  recipients: string[];
  textcontent: string;
  folder?: string;
  flagged?: boolean;
  seen?: boolean;
  answered?: boolean;
  deleted?: boolean;
  attachment?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class SearchService {

  public api: XapianAPI;

  public initSubject: AsyncSubject<any> = new AsyncSubject();
  public noLocalIndexFoundSubject: AsyncSubject<any> = new AsyncSubject();

  // This is fired when UI should refresh the search ( search results altered )
  public indexReloadedSubject: Subject<any> = new Subject();
  public indexUpdatedSubject: Subject<any> = new Subject();

  public localSearchActivated = false;
  public downloadProgress: number = null;
  partitionDownloadProgress: number = null;

  // Status flag for main sidebar (is currently fetching index)
  public indexDownloadingInProgress = false;
  // Trigger for sidebar to activate to stop the download
  public stopIndexDownloadingInProgress = false;

  public downloadableIndexExists = false;
  public indexCreationStarted = false;

  // On first page load we don't want notifications for new messages
  notifyOnNewMessages = false;

  public indexLastUpdateTime = 0; // Epoch time
  public indexUpdateIntervalId: any = null;

  progressSnackBar: MatSnackBarRef<SyncProgressComponent>;

  processedUpdatesMap = {};

  lowestindexid = 0;
  serverIndexSize = -1;
  serverIndexSizeUncompressed = -1;

  memindexdir = 'rmmmemoryindex';
  localdir: string;
  partitionsdir: string;

  isExpired = false;
  initcalled = false;

  persistIndexInProgressSubject: AsyncSubject<any> = null;

  /**
   * Used by the canvas table. We store one row at the time so that we don't look up the document data
   * from the search index db multiple times (for each column) when processing a row
   */
  currentXapianDocId: number;
  currentDocData: SearchIndexDocumentData;

  public indexWorker: Worker;
  private indexWorkerClient: IndexWorkerClient;
  private initialSyncCoordinator: IndexSyncCoordinator = null;
  private initialSyncOperationNumber = 0;
  private initialSyncDownloadedBytes = 0;
  private initialSyncOperation = new IndexSyncOperation();
  private readonly initialSyncStateSubject =
    new BehaviorSubject<IndexSyncState | null>(null);
  private readonly indexDeletionResultSubject = new Subject<string | null>();
  public readonly initialSyncState = this.initialSyncStateSubject.asObservable();

  constructor(public rmmapi: RunboxWebmailAPI,
       private httpclient: HttpClient,
       private snackbar: MatSnackBar,
       private dialog: MatDialog,
       private messagelistservice: MessageListService,
       @Inject(INDEX_WORKER_FACTORY) workerFactory: IndexWorkerFactory) {

    if (typeof Worker !== 'undefined') {
      this.indexWorker = workerFactory();
      this.indexWorkerClient = new IndexWorkerClient(this.indexWorker);

      this.indexWorker.onmessage = ({ data }) => {
        if (this.indexWorkerClient.handleMessage(data)) {
          return;
        }
        // console.log('Message from worker '),
        // console.log(data);
        if (data['action'] === PostMessageAction.localSearchActivated) {
          this.localSearchActivated = data['value'];
        } else if (data['action'] === 'indexUpdated') {
          this.indexUpdatedSubject.next(undefined);
        } else if (data['action'] === PostMessageAction.refreshContentCache) {
          this.rmmapi.deleteCachedMessageContents(data['messageId']);
        } else if (data['action'] === PostMessageAction.openProgressSnackBar) {
          this.progressSnackBar = this.snackbar.openFromComponent(SyncProgressComponent);
        } else if (data['action'] === PostMessageAction.updateProgressSnackBar) {
          this.progressSnackBar.instance.messagetextsubject.next(data['value']);
        } else if (data['action'] === PostMessageAction.closeProgressSnackBar) {
          this.progressSnackBar.dismiss();
        } else if (data['action'] === PostMessageAction.updateMessageListService) {
          this.messagelistservice.updateStaleFolders(data['foldersUpdated']);
          this.messagelistservice.applyChanges([], data['deletedMessages']);
          this.messagelistservice.refreshFolderList();
        } else if (data['action'] === PostMessageAction.indexDeleted) {
          this.indexDeletionResultSubject.next(null);
          this.stopIndexDownloadingInProgress = false;
          console.log('Closing progress dialog');
          ProgressDialog.close();
          this.messagelistservice.fetchFolderMessages();
        } else if (data['action'] === PostMessageAction.indexDeleteFailed) {
          this.indexDeletionResultSubject.next(
            data['message'] || 'Unable to delete the local search index'
          );
          this.stopIndexDownloadingInProgress = false;
          ProgressDialog.close();
          this.messagelistservice.fetchFolderMessages();
        } else if (data['action'] === PostMessageAction.newMessagesNotification) {
          if (this.notifyOnNewMessages && 'Notification' in window &&
            window['Notification']['permission'] === 'granted') {
            const newMessagesTitle = data.prototype.hasOwnProperty('newMessages')
              && data['newMessages'].length > 1 ?
              `${data['newMessages'].length} new email messages` :
              'New email message';
            try {
              // eslint-disable-next-line @typescript-eslint/no-unused-expressions
              new Notification(newMessagesTitle, {
                body: data['newMessages'][0].from[0].name,
                icon: 'assets/icons/icon-192x192.png',
                tag: 'newmessages'
              });
            } catch (e) {
              console.error(e);
              console.log('Should have displayed notification about new messages:', newMessagesTitle);
            }
          }
        }
      };
      this.indexWorker.onerror = (error) => {
        console.error(`Error from worker:  ${error.message}`);
        console.error(`${error.filename} ${error.lineno}`);
        const phase = this.initialSyncCoordinator?.state.value.phase;
        this.indexWorkerClient.reportWorkerFailure(
          error.message,
          phase === 'opening-worker' ? 'opening-worker' :
            phase === 'final-reconciliation' ? 'final-reconciliation' :
              'catching-up-recent'
        );

        // Attempt to recover:
        if (!this.localSearchActivated) {
          console.log('Attempting to recover from index sync fail');
          ProgressDialog.close();
          this.messagelistservice.fetchFolderMessages();
        }

      };
      console.log('Loaded worker');
    }

      // we need to set it manually; DI won't work because of a cyclic dependency
      this.messagelistservice.searchservice.next(this);
      this.messagelistservice.searchservice.complete();
      // Check if we have a local index stored
      this.rmmapi.me.pipe(
        map((me) => {
          this.localdir = 'rmmsearchservice' + me.uid;
          this.partitionsdir = '/partitions' + this.localdir;
          this.isExpired = me.isExpired();
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
                console.error(e);
                console.log('Unable to open local xapian index', (e ? e.message : ''));
                db.close();
                observer.next(false);
              }
          })
        )
      ).subscribe((hasLocalIndex: boolean) => {
        if (!this.isExpired) {
          if (hasLocalIndex) {
            this.init();
            this.initSubject.subscribe((opened) => {
              if (opened) {
                this.indexReloadedSubject.next(undefined);
                this.openDBOnWorker();
              }
            });
          } else {
            // We have no local index - but still need the polling loop here
            this.indexLastUpdateTime = new Date().getTime(); // Set the last update time to now since we don't have a local index
            this.indexWorker.postMessage({'action': PostMessageAction.updateIndexWithNewChanges});
            this.noLocalIndexFoundSubject.next(true);
            this.noLocalIndexFoundSubject.complete();
            this.initSubject.next(false);
            this.initSubject.complete();
          }
        } else {
          console.log('Account has expired, access to /account/subscriptions only');
        }
      });

    this.indexUpdatedSubject.subscribe(() => {
      FS.syncfs(true, () => {
          // console.log('Main: Syncd files:');
          // console.log(FS.stat(XAPIAN_GLASS_WR));
          // FS.readdir(this.partitionsdir).forEach((f) => {
            // console.log(`${f}`);
            // console.log(FS.stat(`${this.partitionsdir}/${f}`));
          // });
        this.api.reloadXapianDatabase();
        this.indexReloadedSubject.next(undefined);
      });
    });
    this.indexReloadedSubject.subscribe(() => {
      // console.log('searchservice updating folderCounts');
      // we're sending both "indexUpdated", and "updateMessageListService"
      // this.messagelistservice.refreshFolderCounts();
      this.messagelistservice.refreshFolderList();
    });

     this.messagelistservice.folderListSubject
        .pipe(distinctUntilChanged((prev: FolderListEntry[], curr: FolderListEntry[]) => {
          return prev.length === curr.length
            && prev.every((f, index) =>
              objectEqualWithKeys(f, curr[index], [
                'folderId', 'totalMessages', 'newMessages',
              ]));
        }))
        .subscribe((folders) =>
          this.indexWorker.postMessage({'action': PostMessageAction.folderListUpdate, 'value': folders })
    );
  }

  public init() {
    if (this.initcalled) {
      return;
    }
    this.initcalled = true;

    this.downloadProgress = 0; // Set indeterminate progress bar

    // Update local index with message seen flag
    // FIXME: Is this seeing a different copy to the one the worker opened?
    // seems stuff ought to work without this, after the indexUpdate loop
    // but it doesn't.
    this.rmmapi.messageFlagChangeSubject
      .subscribe((msgFlagChange) => {
        if (msgFlagChange.flaggedFlag !== null) {
          if (msgFlagChange.flaggedFlag === true) {
            this.indexWorker.postMessage(
              {'action': PostMessageAction.addTermToDocument,
               'messageId': msgFlagChange.id,
               'term': 'XFflagged'
              });
          } else {
            this.indexWorker.postMessage(
              {'action': PostMessageAction.removeTermFromDocument,
               'messageId': msgFlagChange.id,
               'term': 'XFflagged'
              });
          }
        } else if (msgFlagChange.seenFlag !== null) {
          if (msgFlagChange.seenFlag === true) {
            this.indexWorker.postMessage(
              {'action': PostMessageAction.addTermToDocument,
               'messageId': msgFlagChange.id,
               'term': 'XFseen'
              });
          } else {
            this.indexWorker.postMessage(
              {'action': PostMessageAction.removeTermFromDocument,
               'messageId': msgFlagChange.id,
               'term': 'XFseen'
              });
          }
        } else {
          console.error('Empty flag change message', msgFlagChange);
        }
        // console.log('Flag Change: local index');
      });

    // open for reading (for canvastable comms)
    xapianLoadedSubject.subscribe(() => {
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
            // just fyi, we don't need this for reading
            console.log('Last index timestamp ', FS.stat('xapianglasswr/docdata.glass').mtime);

            this.openStoredMainPartition();

            const docCount: number = this.api.getXapianDocCount();
            console.log(docCount, 'docs in Xapian database');

            // Just for checking its sane:
            try {
              this.indexLastUpdateTime = parseInt(FS.readFile('indexLastUpdateTime', { encoding: 'utf8' }), 10);
              if (this.indexLastUpdateTime > new Date().getTime()) {
                this.indexLastUpdateTime = new Date().getTime();
              }
            } catch (e) {
              console.error(e);
              if (!this.updateIndexLastUpdateTime()) {
                // Corrupt xapian index - delete it and subscribe to changes (fallback to websocket search)
                // Deal with this on the non-worker side, then tell it to
                // do the same thing.
                this.deleteLocalIndex();
                return;
              }
            }

            this.localSearchActivated = true;
            this.initSubject.next(true);

            FS.syncfs(true, async () => {
              // console.log('Loading partitions');
              this.openStoredPartitions();
            });


          } catch (e) {
            console.error(e);
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
          // console.log('adding partition ', f);

          this.api.addFolderXapianIndex(`${this.partitionsdir}/${f}`);
        }
      });
    } catch (e) {
      console.error(e);
    }
  }

  public openDBOnWorker() {
    this.persistIndex().subscribe(() =>
      this.indexWorker.postMessage({ 'localdir': this.localdir,
                                     'partitionsdir': this.partitionsdir,
                                     'action': PostMessageAction.opendb
                                   }));
  }

  private openStoredMainPartition() {
    this.api.initXapianIndexReadOnly(XAPIAN_GLASS_WR);
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
        // console.log(results);
        // console.log(this.api.getStringValue(results[0][0], 2));
        // Get date of latest message
        const dateParts = this.api.getStringValue(results[0][0], 2)
                      .match(/([0-9][0-9][0-9][0-9])([0-9][0-9])([0-9][0-9])/)
                      .map((val, ndx) => ndx > 0 ? parseInt(val, 10) : 0);

        let latestSearchIndexDate = new Date(dateParts[1], dateParts[2] - 1, dateParts[3]);
        // In case we get emails with dates far in the future!
        console.log('Latest search index date is', latestSearchIndexDate);
        if (latestSearchIndexDate > new Date()) {
          latestSearchIndexDate = new Date();
        }
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

  // Instruction to delete from the user:
  public deleteLocalIndex(): Observable<any> {
    if (!this.localSearchActivated) {
      console.log('Tried to delete local index when it is not present');
      return;
    }
    this.localSearchActivated = false;
    this.indexWorker.postMessage({'action': PostMessageAction.stopIndexUpdates });

    return new Observable((observer) => {
      ProgressDialog.open(this.dialog);

      this.api.closeXapianDatabase();
      this.indexWorker.postMessage({'action': PostMessageAction.deleteLocalIndex});

      console.log('Closing indexed dbs');
      // ---- Hack for emscripten not closing databases
      closeIndexedDatabaseConnections(IDBFS.dbs);

    });

  }

  public getMessageIdFromDocId(documentId: any): number {
    return parseInt(this.api.getDocumentData(documentId).split('\t')[0].match(/[0-9]+/)[0], 10);
  }

  public startInitialIndexSynchronization(): Observable<IndexSyncState> {
    if (!canStartInitialSync(this.indexDownloadingInProgress)) {
      return this.initialSyncCoordinator.state.asObservable();
    }
    const operationId = `index-sync-${++this.initialSyncOperationNumber}`;
    this.initialSyncOperation = new IndexSyncOperation();
    this.initialSyncDownloadedBytes = 0;
    this.indexDownloadingInProgress = true;
    this.stopIndexDownloadingInProgress = false;
    this.notifyOnNewMessages = false;
    this.indexWorkerClient.startOperation(operationId);

    let historicalDownloadAccepted = false;
    let discoveredManifest: NormalizedIndexManifest;
    const dependencies: IndexSyncCoordinatorDependencies = {
      discoverManifest: async () => {
        discoveredManifest = await this.discoverIndexManifest();
        return discoveredManifest;
      },
      downloadMainPartition: (manifest, onProgress) =>
        this.downloadInitialMainPartition(manifest, onProgress),
      openWorkerIndex: () => this.openInitialWorkerIndex(),
      catchUpRecent: (baseline, finalizeWatermark, onChunk) =>
        this.catchUpRecentMessages(baseline, finalizeWatermark, onChunk),
      publishLocalIndex: () => this.publishInitialLocalIndex(),
      reloadPublishedLocalIndex: () => this.reloadPublishedLocalIndex(),
      downloadHistoricalPartition: (partition, onProgress) =>
        this.downloadInitialHistoricalPartition(partition, operationId, onProgress),
      shouldDownloadHistoricalPartition: async (_partition, index) => {
        if (index === 0 || historicalDownloadAccepted) {
          return true;
        }
        historicalDownloadAccepted = await this.confirmInitialHistoricalDownload(
          discoveredManifest,
          index,
          this.initialSyncOperation
        );
        return historicalDownloadAccepted;
      },
      startPeriodicSync: () => this.indexWorkerClient.startPeriodicSync(),
      cancelWorkerSync: () => this.indexWorkerClient.cancelInitialSync(),
      discardIncompleteIndex: () => this.discardInitialLocalIndex(),
      waitBeforeRetry: delayMilliseconds => this.initialSyncOperation.wait(delayMilliseconds)
    };
    this.initialSyncCoordinator = new IndexSyncCoordinator(
      operationId,
      dependencies,
      this.initialSyncOperation
    );
    this.initialSyncCoordinator.state.subscribe(state => {
      this.initialSyncStateSubject.next(state);
      this.indexDownloadingInProgress = ![
        'complete', 'failed', 'cancelled'
      ].includes(state.phase);
    });
    this.initialSyncCoordinator.start();
    return this.initialSyncCoordinator.state.asObservable();
  }

  public cancelInitialIndexSynchronization(): void {
    if (this.initialSyncCoordinator) {
      this.initialSyncCoordinator.cancel();
    } else {
      this.initialSyncOperation.cancel();
    }
  }

  private async discoverIndexManifest(): Promise<NormalizedIndexManifest> {
    const manifest = await firstValueFrom(
      this.httpclient.get<DownloadableSearchIndexMap>('/rest/v1/searchindex/partitions')
    );
    return normalizeIndexManifest(manifest);
  }

  private async downloadInitialMainPartition(
    manifest: NormalizedIndexManifest,
    onProgress: (downloadedBytes: number) => void
  ): Promise<void> {
    await this.prepareWorkerForIndexReplacement();
    this.init();
    await firstValueFrom(this.initSubject);

    if (this.localSearchActivated) {
      this.api.closeXapianDatabase();
      this.localSearchActivated = false;
    }
    this.ensureDirectory(XAPIAN_GLASS_WR);

    const mainPartition = manifest.partitions.find(partition => partition.number === 0);
    if (!mainPartition) {
      throw new Error('Index manifest has no main partition');
    }

    const files = [
      { filename: 'iamglass', fileno: 1 },
      { filename: 'docdata.glass', fileno: 2 },
      { filename: 'termlist.glass', fileno: 3 },
      { filename: 'postlist.glass', fileno: 4 }
    ];
    for (const file of files) {
      const data = await this.downloadIndexFile(
        `/mail/download_xapian_index?ngsw-bypass=1&fileno=${file.fileno}`,
        loaded => onProgress(this.initialSyncDownloadedBytes + loaded)
      );
      FS.writeFile(`${XAPIAN_GLASS_WR}/${file.filename}`, data, { encoding: 'binary' });
      this.initialSyncDownloadedBytes += data.length;
      onProgress(this.initialSyncDownloadedBytes);
    }

    this.api.initXapianIndexReadOnly(XAPIAN_GLASS_WR);
    if (!this.updateIndexLastUpdateTime()) {
      throw new Error('Downloaded index has no valid synchronization baseline');
    }
    FS.writeFile('indexLastUpdateTime', `${this.indexLastUpdateTime}`, { encoding: 'utf8' });
    await this.syncFileSystem(false);
  }

  private prepareWorkerForIndexReplacement(): Promise<void> {
    const retainedFailure = this.indexWorkerClient.getWorkerFailure();
    if (retainedFailure) {
      return Promise.reject(new Error(retainedFailure.message));
    }
    return new Promise((resolve, reject) => {
      const subscription = this.indexWorkerClient.events.subscribe(event => {
        if (event.action === 'indexReplacementReady') {
          subscription.unsubscribe();
          resolve();
        } else if (event.action === 'recentCatchUpFailed') {
          subscription.unsubscribe();
          reject(new Error(event.message));
        }
      });
      this.indexWorkerClient.prepareIndexReplacement();
    });
  }

  private openInitialWorkerIndex(): Promise<number> {
    const retainedFailure = this.indexWorkerClient.getWorkerFailure();
    if (retainedFailure) {
      return Promise.reject(new Error(retainedFailure.message));
    }
    return new Promise((resolve, reject) => {
      const subscription = this.indexWorkerClient.events.subscribe(event => {
        if (event.action === 'workerIndexReady') {
          subscription.unsubscribe();
          resolve(event.baseline);
        } else if (event.action === 'recentCatchUpFailed' &&
          event.phase === 'opening-worker') {
          subscription.unsubscribe();
          reject(new Error(event.message));
        }
      });
      this.indexWorkerClient.openIndex(this.localdir, this.partitionsdir);
    });
  }

  private catchUpRecentMessages(
    baseline: number,
    finalizeWatermark: boolean,
    onChunk: (event: RecentChunkCommittedEvent) => Promise<void>
  ): Promise<RecentCatchUpCompleteEvent> {
    const retainedFailure = this.indexWorkerClient.getWorkerFailure();
    if (retainedFailure) {
      return Promise.reject(new Error(retainedFailure.message));
    }
    return new Promise((resolve, reject) => {
      let publications = Promise.resolve();
      const subscription = this.indexWorkerClient.events.subscribe(event => {
        if (event.action === 'recentChunkCommitted') {
          publications = publications.then(async () => {
            await onChunk(event);
            this.indexWorkerClient.acknowledgeRecentChunk(event.page, event.batch);
          });
          publications.catch(error => {
            subscription.unsubscribe();
            this.indexWorkerClient.cancelInitialSync();
            reject(error);
          });
        } else if (event.action === 'recentCatchUpComplete') {
          subscription.unsubscribe();
          publications.then(() => resolve(event)).catch(reject);
        } else if (event.action === 'recentCatchUpFailed') {
          subscription.unsubscribe();
          reject(new Error(event.message));
        } else if (event.action === 'initialSyncCancelled') {
          subscription.unsubscribe();
          reject(new Error('Initial index synchronization cancelled'));
        }
      });
      this.indexWorkerClient.catchUpRecent(baseline, finalizeWatermark);
    });
  }

  private async publishInitialLocalIndex(): Promise<void> {
    await this.rehydratePublishedLocalIndex();
    this.messagelistservice.refreshFolderList();
  }

  private async reloadPublishedLocalIndex(): Promise<void> {
    await this.rehydratePublishedLocalIndex();
  }

  private rehydratePublishedLocalIndex(): Promise<void> {
    return rehydratePublishedIndexView({
      close: () => this.api.closeXapianDatabase(),
      removeLocalCopy: () => this.removeLocalMainPartition(),
      populate: () => this.syncFileSystem(true),
      openMainPartition: () => this.openStoredMainPartition(),
      openHistoricalPartitions: () => this.openStoredPartitions(),
      activate: () => {
        this.localSearchActivated = true;
      },
      fallback: () => {
        this.localSearchActivated = false;
        this.messagelistservice.fetchFolderMessages();
      }
    });
  }

  private removeLocalMainPartition(): void {
    try {
      FS.stat(XAPIAN_GLASS_WR);
    } catch (_error) {
      return;
    }
    FS.readdir(XAPIAN_GLASS_WR)
      .filter(filename => filename !== '.' && filename !== '..')
      .forEach(filename => FS.unlink(`${XAPIAN_GLASS_WR}/${filename}`));
    FS.rmdir(XAPIAN_GLASS_WR);
  }

  private async downloadInitialHistoricalPartition(
    partition: NormalizedIndexPartition,
    operationId: string,
    onProgress: (downloadedBytes: number) => void
  ): Promise<void> {
    const startingDownloadedBytes = this.initialSyncDownloadedBytes;
    const temporaryFolder = `${partition.folder}.sync-${operationId}`;
    const temporaryPath = `${this.partitionsdir}/${temporaryFolder}`;
    const finalPath = `${this.partitionsdir}/${partition.folder}`;
    this.ensureDirectory(temporaryPath);

    try {
      for (const file of partition.files) {
        const data = await this.downloadIndexFile(
          `/rest/v1/searchindex/file/${partition.folder}/${file.filename}?ngsw-bypass=1`,
          loaded => onProgress(this.initialSyncDownloadedBytes + loaded)
        );
        FS.writeFile(`${temporaryPath}/${file.filename}`, data, { encoding: 'binary' });
        this.initialSyncDownloadedBytes += data.length;
        onProgress(this.initialSyncDownloadedBytes);
      }
      await promoteHistoricalPartition({
        removeExisting: async () => {
          await this.prepareWorkerForIndexReplacement();
          this.removeTemporaryPartition(finalPath);
          await this.syncFileSystem(false);
        },
        promote: () => FS.rename(temporaryPath, finalPath),
        persist: () => this.syncFileSystem(false),
        open: () => this.api.addFolderXapianIndex(finalPath),
        reopenWorker: async () => {
          await this.openInitialWorkerIndex();
        },
        removePromoted: async () => {
          this.removeTemporaryPartition(finalPath);
          await this.syncFileSystem(false);
        }
      });
      this.indexReloadedSubject.next(undefined);
    } catch (error) {
      this.initialSyncDownloadedBytes = startingDownloadedBytes;
      onProgress(startingDownloadedBytes);
      this.removeTemporaryPartition(temporaryPath);
      throw error;
    }
  }

  private async confirmInitialHistoricalDownload(
    manifest: NormalizedIndexManifest,
    historicalIndex: number,
    operation = this.initialSyncOperation
  ): Promise<boolean> {
    const historicalPartitions = manifest.partitions.filter(partition => partition.number > 0);
    const remainingPartitions = historicalPartitions.slice(historicalIndex);
    const remainingDownloadMB = Math.round(remainingPartitions.reduce(
      (total, partition) => total + partition.files.reduce(
        (partitionTotal, file) => partitionTotal + file.compressedsize,
        0
      ),
      0
    ) / (1024 * 1024));
    const remainingMessages = remainingPartitions.reduce(
      (total, partition) => total + partition.numberOfMessages,
      0
    );
    const dialog = this.dialog.open(ConfirmDialog);
    dialog.componentInstance.title = 'Continue synchronizing?';
    dialog.componentInstance.question = `Already synchronized index for
        ${this.api.getXapianDocCount()} of
        your most recent messages. To synchronize the entire index
        (another ${remainingMessages} messages),
        there's an additional download of ${remainingDownloadMB} MB.`;
    return firstValueFrom(merge(
      dialog.afterClosed().pipe(map(value => Boolean(value))),
      operation.cancelled$.pipe(
        tap(() => dialog.close()),
        map(() => false)
      )
    ).pipe(take(1)));
  }

  private downloadIndexFile(
    url: string,
    onProgress: (loaded: number) => void
  ): Promise<Uint8Array> {
    this.initialSyncOperation.throwIfCancelled();
    return firstValueFrom(this.httpclient.request(
      new HttpRequest('GET', url, {
        reportProgress: true,
        responseType: 'arraybuffer'
      })
    ).pipe(
      tap(event => {
        if (event.type === HttpEventType.DownloadProgress) {
          onProgress(event.loaded);
        }
      }),
      filter(event => event instanceof HttpResponse),
      map(event => new Uint8Array((event as HttpResponse<ArrayBuffer>).body)),
      takeUntil(this.initialSyncOperation.cancelled$)
    ));
  }

  private syncFileSystem(populate: boolean): Promise<void> {
    return new Promise((resolve, reject) => FS.syncfs(populate, error => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    }));
  }

  private ensureDirectory(path: string): void {
    try {
      FS.stat(path);
    } catch (_error) {
      FS.mkdir(path);
    }
  }

  private removeTemporaryPartition(path: string): void {
    try {
      FS.readdir(path)
        .filter(filename => filename !== '.' && filename !== '..')
        .forEach(filename => FS.unlink(`${path}/${filename}`));
      FS.rmdir(path);
    } catch (_error) {
      // The failed download may not have created its temporary directory.
    }
  }

  private async discardInitialLocalIndex(): Promise<void> {
    this.localSearchActivated = false;
    try {
      this.api?.closeXapianDatabase();
    } catch (_error) {
      // The read-only database may not have opened yet.
    }
    if (!this.indexWorkerClient.getWorkerFailure()) {
      // IndexedDB deletion is blocked while this thread retains an IDBFS connection.
      closeIndexedDatabaseConnections(IDBFS.dbs);
      const deletionResult = firstValueFrom(
        this.indexDeletionResultSubject.pipe(take(1))
      );
      this.indexWorker.postMessage({ action: PostMessageAction.deleteLocalIndex });
      const error = await deletionResult;
      if (error) {
        throw new Error(error);
      }
    } else {
      this.messagelistservice.fetchFolderMessages();
    }
  }

  public downloadIndexFromServer(): Observable<boolean> {
    this.indexWorker.postMessage({'action': PostMessageAction.stopIndexUpdates });
    this.notifyOnNewMessages = false; // we don't want notification on first message update after index load
    this.indexDownloadingInProgress = true;
    this.init();

    // initSubject returns false if no db yet, but that's fine
    // we're downloading it here..
    return this.initSubject.pipe(
        mergeMap(() => this.checkIfDownloadableIndexExists()),
        mergeMap((res) => new Observable<boolean>( (observer) => {
        if (!res) {
          this.localSearchActivated = false;
          this.indexLastUpdateTime = 0;
          this.indexDownloadingInProgress = false;
          // restart updates
          this.indexWorker.postMessage({'action': PostMessageAction.updateIndexWithNewChanges });
          this.stopIndexDownloadingInProgress = true;
          observer.next(false);
          return;
        }

        // console.log('Download index');

        this.downloadProgress = 0;
        let loaded = 0;

          const downloadAndWriteFile = (filename: string, fileno: number): Observable<void> => {
            if (!this.stopIndexDownloadingInProgress) {
              return this.httpclient.request(
                new HttpRequest<any>(
                  'GET', '/mail/download_xapian_index?ngsw-bypass=1&fileno=' + fileno,
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
            } else {
              this.downloadProgress = null;
              return of(null);
            }
        };

        if (this.localSearchActivated) {
          // FIXME: call indexWorker here?
          this.api.closeXapianDatabase();
        }
        try {
          FS.stat(XAPIAN_GLASS_WR);
        } catch (e) {
          console.error(e);
          FS.mkdir(XAPIAN_GLASS_WR);
        }

        downloadAndWriteFile('iamglass', 1).pipe(
          mergeMap(() => downloadAndWriteFile('docdata.glass', 2)),
          mergeMap(() => downloadAndWriteFile('termlist.glass', 3)),
          mergeMap(() => downloadAndWriteFile('postlist.glass', 4)),
        ).subscribe(() => {
          if(!this.stopIndexDownloadingInProgress) {
            this.api.initXapianIndexReadOnly(XAPIAN_GLASS_WR);
            console.log(this.api.getXapianDocCount() + ' docs in Xapian database');
            this.localSearchActivated = true;
            this.messagelistservice.refreshFolderList();

            this.indexWorker.postMessage({'action': PostMessageAction.updateIndexWithNewChanges });
            this.updateIndexLastUpdateTime();

            this.downloadProgress = null;
            observer.next(true);
          }
        });
      })));
  }


  /**
   * Move messages instantly in the local index (this does not affect server,
   * so the server must also be updated separately)
   * @param messageIds
   * @param destinationfolderPath
   */
  moveMessagesToFolder(messageIds: number[], destinationfolderPath: string) {
    if (!this.api) {
      return;
    }
    this.indexWorker.postMessage(
      {'action': PostMessageAction.moveMessagesToFolder,
       'messageIds': messageIds,
       'value': destinationfolderPath });
  }

    /**
   * Delete messages instantly from the local index ( does not affect server )
   */
  deleteMessages(messageIds: number[]) {
    if (!this.api) {
      return;
    }
    this.indexWorker.postMessage(
      {'action': PostMessageAction.deleteMessages,
       'messageIds': messageIds });
  }

  /**
   * Persist index, we only do this once in the main thread,
   * when starting from scratch (else the worker does all the persisting)
   */
    persistIndex(): Observable<boolean> {
    // console.log(`Persist: localSearch: ${this.localSearchActivated}`);
      if (!this.localSearchActivated) {
        return of(false);
      } else {
        if (!this.persistIndexInProgressSubject) {
          this.persistIndexInProgressSubject = new AsyncSubject();

          console.log('Persisting to indexeddb');

          FS.writeFile('indexLastUpdateTime', '' + this.indexLastUpdateTime, { encoding: 'utf8' });
          FS.syncfs(false, () => {
            // console.log('Syncd files:');
            // console.log(FS.stat(XAPIAN_GLASS_WR));
            FS.readdir(this.partitionsdir).forEach((f) => {
              // console.log(`${f}`);
              // console.log(FS.stat(`${this.partitionsdir}/${f}`));
            });
            this.persistIndexInProgressSubject.next(true);
            this.persistIndexInProgressSubject.complete();
            this.persistIndexInProgressSubject = null;
            // this.indexNotPersisted = false;
            console.log('Done persisting to indexeddb');
          });
        }
        return this.persistIndexInProgressSubject;
      }
  }

  // Also in index.worker.ts
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

  /// Get message IDs of all indexed messages in a given time range -- [inclusive, exclusive), newest first
  getMessagesInTimeRange(start: Date, end: Date, folder?: string): number[] {
    const toRangeString = (dt: Date) => dt ? dt.toISOString().substr(0, 10).replace(/-/g, '') : '';
    let query = `date:${toRangeString(start)}..${toRangeString(end)}`;
    if (folder) {
      query += ` folder:"${folder}"`;
    }

    this.api.setStringValueRange(2, 'date:');
    return this.api.sortedXapianQuery(
      query, 2, 1, 0, 1024, -1
    ).map((pair: number[]) => pair[0]);
  }

  checkIfDownloadableIndexExists(): Observable<boolean> {
      return this.httpclient.get('/mail/download_xapian_index?ngsw-bypass=1&exists=check').pipe(
            map((stat: any) => {
              this.serverIndexSize = stat.size;
              this.serverIndexSizeUncompressed = stat.uncompressedsize;
              // console.log('Downloadable index exists: ' + stat.exists);
              return stat.exists;
            })
          );
    }

    downloadPartitions(): Observable<any> {
      let totalSize;
      let partitions: DownloadablePartition[];
      let userHasAcceptedDownloadAllPartitions = false;
      return this.httpclient.get('/rest/v1/searchindex/partitions')
        .pipe(
          catchError(() =>
            of(new DownloadableSearchIndexMap())
          ),
          map(async (searchindexmap: DownloadableSearchIndexMap) => {
            partitions = searchindexmap.partitions.filter((p, ndx) => ndx > 0);
            totalSize = partitions.reduce((prev, curr) => prev +
              curr.files.reduce((p, c) => c.uncompressedsize + p, 0), 0);
            if (totalSize === 0) {
              // console.log('No extra search index partitions');
              this.openDBOnWorker();
              this.indexReloadedSubject.next(undefined);
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
                  // totalMessages = the number of messages in the remaining partitions yet to be synchronized 
                  const totalMessages = partitions.reduce((prev, curr, partitionNdx) => prev +
                        curr.numberOfMessages,
                        0);

                  dialog.componentInstance.title = 'Continue synchronizing?';
                  dialog.componentInstance.question = `Already synchronized index for
                      ${doccount} of
                      your most recent messages. To synchronize the entire index
                      (another ${totalMessages} messages),
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
              if (!this.stopIndexDownloadingInProgress) {
                let currentFileIndex = 0;
                return from(
                  p.files.map(
                    (file) =>
                      this.httpclient.request(
                        new HttpRequest(
                          'GET',
                          `/rest/v1/searchindex/file/${p.folder}/${file.filename}?ngsw-bypass=1`, {
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
                          console.error(e);
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
                    // console.log(`Opening partition ${p.folder}`);
                    this.api.addFolderXapianIndex(`${this.partitionsdir}/${p.folder}`);
                  }),
                  map(() => true)
                );
              } else {
                this.partitionDownloadProgress = null;
                return of(null);
              }
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
          tap(async () => {
            this.partitionDownloadProgress = null;
            if (!this.stopIndexDownloadingInProgress) {
              this.openDBOnWorker();
              this.indexReloadedSubject.next(undefined);
            }
          })
        );
    }

    // We need this because getDocData is fully synchronous (and treated as such),
    // while it actually updates SearchIndexDocumentData.textcontent asynchronously,
    // and not fast enough for the caller to get it.
    //
    // Abusing the fact that getDocData is called multiple times for the same message,
    // this cache ensures that at least the future calls will get the textcontent synchronously
    // eslint-disable-next-line @typescript-eslint/member-ordering,
    messageTextCache = new Map<number, string>();

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
            recipients: [],
            textcontent: null
          };

          const rmmMessageId = parseInt(this.currentDocData.id.substring(1), 10);
          if (this.messageTextCache.has(rmmMessageId)) {
              this.currentDocData.textcontent = this.messageTextCache.get(rmmMessageId);
          }
          this.updateMessageText(rmmMessageId);

          try {
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
                } else if (s === XAPIAN_TERM_HASATTACHMENTS) {
                  this.currentDocData.attachment = true;
                } else if (s.indexOf('XRECIPIENT') === 0) {
                  const recipient = s.substring('XRECIPIENT:'.length);
                  this.currentDocData.recipients.push(recipient);
                }
              });
          } catch (e) {
            console.log('Failed to get documentXtermList: ',  e);
          }
          this.currentXapianDocId = docid;

          // We would be setting this locally after a postMessage?
          // if (!this.pendingIndexVerifications[this.currentDocData.id]) {
          //   if (this.currentDocData.folder === 'Sent' && !this.currentDocData.recipients) {
          //     this.currentDocData.folder = 'Sent '; // Force updating index to add recipient term
          //   }
          //   // postMessage
          //   this.pendingIndexVerifications[this.currentDocData.id] = this.currentDocData;
          // }
        }
        return this.currentDocData;
    }

  public setCurrentFolder(folder: string) {
      this.indexWorker.postMessage({
        'action': PostMessageAction.setCurrentFolder,
        'folder': folder });
    }

  // fetch message contents, we actually only want the "text.text" part here
  // then we can use it for previews and search, both with/without local index
  // skip haschanges/updates if we already saw this one ..
  public updateMessageText(messageId: number): boolean {
    if (!this.messageTextCache.has(messageId)) {
      this.rmmapi.getMessageContents(messageId).subscribe((content) => {
        if (content['status'] === 'success') {
          this.messageTextCache.set(messageId, content.text.text);
          if (this.messagelistservice.messagesById[messageId]) {
            this.messagelistservice.messagesById[messageId].plaintext = content.text.text;
          }
        } else {
          if (content.hasOwnProperty('errors')) {
            // this is an error restapi generated
            console.error(`DataError in updateMessageText ${messageId}`, content['errors']);
          }
          // even if we dont know where it came from, still dont retry
          // it this session
          this.messageTextCache.set(messageId, '');
        }
      },
     (err) => {
       console.error(`HTTPError in updateMessageText ${messageId}`, err);
       // stop repeatedly looking up broken ones
       this.messageTextCache.set(messageId, '');
     });
      return true;
    }
    return false;
  }
}
