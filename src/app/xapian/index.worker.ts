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

/// <reference lib="webworker.importscripts" />
import { Observer, Observable, of, from, AsyncSubject } from 'rxjs';
import { mergeMap, map, filter, catchError, tap, take, bufferCount } from 'rxjs/operators';

import { XapianAPI } from '@runboxcom/runbox-searchindex';
import { DownloadableSearchIndexMap, DownloadablePartition } from '@runboxcom/runbox-searchindex/downloadablesearchindexmap.class';
import { IndexingTools } from '../common/messageinfo';
import { FolderListEntry } from '../common/folderlistentry';
import { FolderStatsEntry } from '../common/folderstatsentry';
import { loadXapian } from './xapianwebworkerloader';
import { listAllMessages, listDeletedMessagesSince, folderStats, updateFolderCounts } from '../rmmapi/restapi_standalone';
import { PostMessageAction } from './messageactions';

declare var FS;
declare var IDBFS;
declare var Module;

const XAPIAN_TERM_FOLDER = 'XFOLDER:';
const XAPIAN_TERM_FLAGGED = 'XFflagged';
const XAPIAN_TERM_SEEN = 'XFseen';
const XAPIAN_TERM_ANSWERED = 'XFanswered';
const XAPIAN_TERM_DELETED = 'XFdeleted';
const XAPIAN_TERM_MISSING_BODY_TEXT = 'XFmissingbodytext';
const XAPIAN_TERM_HASATTACHMENTS = 'XFattachment';

export const XAPIAN_GLASS_WR = 'xapianglasswr';

const MAX_DISCREPANCY_CHECK_LIMIT = 50000; // Unable to check discrepancies for folders with more than 50K messages
// stolen from rbwebmail.ts, should be in a sep file both load?
const LIST_ALL_MESSAGES_CHUNK_SIZE = 10000;

const ctx: Worker = self as any;

class SearchIndexDocumentData {
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

class SearchIndexDocumentUpdate {
  constructor(
    public id: number,
    public updateFunction: () => void
  ) {}
}

class SearchIndexService {
  public api: XapianAPI;
  public indexingTools: IndexingTools;
  localdir: string;
  partitionsdir: string;
  private initcalled = false;

  public localSearchActivated = false;

  // postMessage ?
  // messagelistservice stuff!
  currentFolder   = 'Inbox';
  unindexedFolders = ['Trash', 'Spam', 'Templates'];
  folderList: FolderListEntry[];
  messageTextCache = new Map<number, string>();

  public indexLastUpdateTime = 0; // Epoch time
  public indexUpdateIntervalId: any = null;
  numberOfMessagesSyncedLastTime = 0;
  folderCountDiscrepanciesCheckedCount: {[folderName: string]: number} = {};

  serverIndexSize = -1;
  serverIndexSizeUncompressed = -1;
  public initSubject: AsyncSubject<any> = new AsyncSubject();
  // Listing all messages happens in chunks of 1000 - page is controlled here
  public listAllMessagesPage = 0;
  public processMessageHistoryCount = 0;
  public processMessageHistoryProgress = 0;
  public processMessageHistorySkipLiveTableUpdates = true;
  public skipLiveUpdatesIndexingMessageContent = false;
  pendingIndexVerifications: {[id: string]: SearchIndexDocumentData} = {};
  pendingMessagesToProcess: SearchIndexDocumentUpdate[];
  persistIndexInProgressSubject: AsyncSubject<any> = null;
  indexNotPersisted = false;
  /**
   * Extra per message verification of index contents to assure that it is in sync with the database
   * (workaround while waiting for deleted_messages support, but also a good extra check)
   */

  messageProcessingInProgressSubject: AsyncSubject<any> = null;
  processMessageIndex = 0;

  /**
   * what the indexer update is currently working on
   */
  currentIndexUpdateMessageIds = new Set();


  // constructor( private httpclient: HttpClient ) {}

  loadSearchIndexes(db: IDBDatabase): Observable<Object> {
    console.log(`Worker: got localdir: ${this.localdir}`);
    return new Observable<any>((observer) => {
      try {
        const req: IDBRequest = db.transaction('FILE_DATA', 'readonly')
          .objectStore('FILE_DATA')
          .get('/' + this.localdir + '/xapianglasswr/iamglass');
        req.onsuccess = () => {
          // console.log(`Worker: opened ${this.localdir}`);
          // Don't need these observer results.
          // console.log(req);
          if (req.result !== undefined) {
            // console.log('Worker: Req defined, running init()');
            this.init();
            observer.next(true);
          } else {
            // we shouldnt get here cos we only open index on worker if it exists in main thread
            // console.log('Worker: Req undefined');
            observer.next(false);
          }
          db.close();
        };
      } catch (e) {
        console.log('Worker: Unable to open local xapian index', (e ? e.message : ''));
        db.close();
        // console.log('Worker: Req failed');
        observer.next(false);
        // observer.next({'action': PostMessageAction.dbOpen, 'hasLocalindex': false});
      }
    });
  }

  init() {
    if (this.initcalled) {
      return;
    }
    this.initcalled = true;

    // this needs to become a postMessage..
    // this.downloadProgress = 0; // Set indeterminate progress bar

    // its a DedicatedGlobalGorkerScope
    // console.log(self);
    loadXapian(self).subscribe(() => {
      const initXapianFileSys = () => {
        this.api =  new XapianAPI();
        this.indexingTools = new IndexingTools(this.api);

        FS.mkdir(this.localdir);
        FS.mount(IDBFS, {}, '/' + this.localdir);
        FS.chdir('/' + this.localdir);
        console.log('Worker: Local dir is ' + this.localdir);

        FS.syncfs(true, (err) => {
          console.log('Worker: File system synced - starting Xapian');

          FS.mkdir(this.partitionsdir); // Partitions will sync later down if there is a main partition
          FS.mount(IDBFS, {}, this.partitionsdir);

          try {
            console.log('Worker: Last index timestamp ', FS.stat('xapianglasswr/docdata.glass').mtime);

            this.openStoredMainPartition();

            const docCount: number = this.api.getXapianDocCount();
            console.log('Worker: ' + docCount, 'docs in Xapian database');

            try {
              this.indexLastUpdateTime = parseInt(FS.readFile('indexLastUpdateTime', { encoding: 'utf8' }), 10);
            } catch (e) {
              if (!this.updateIndexLastUpdateTime()) {
                // Failed to load, do nothing here, the non-worker side
                // will tell us to delete the index and run updates
                return;
              }
            }

            this.localSearchActivated = true;
            ctx.postMessage({'action': PostMessageAction.localSearchActivated, 'value': this.localSearchActivated });

            FS.syncfs(true, async () => {
              // console.log('Worker: Loading partitions');
              this.openStoredPartitions();
              ctx.postMessage({'action': PostMessageAction.indexUpdated});
              await this.updateIndexWithNewChanges();
            });


          } catch (e) {
            console.log('Worker: No xapian db');
            this.initSubject.next(false);
          }

          // this.downloadProgress = null; // Set indeterminate progress bar
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

          this.api.addFolderXapianIndex(`${this.partitionsdir}/${f}`);
        }
      });
    } catch (e) {}
  }

  private openStoredMainPartition() {
    this.api.initXapianIndex(XAPIAN_GLASS_WR);
  }

  public deleteLocalIndex(): Observable<any> {
    if (!this.localSearchActivated) {
      // called mid-index load and we hadnt loaded it anyway
      // send indexDeleted so the progress dialog closes
      console.log('Worker: Tried to delete local index when it is not present');
      ctx.postMessage({'action': PostMessageAction.indexDeleted});
      return of(null);
    }

    this.localSearchActivated = false;
    
    return new Observable((observer) => {
      console.log('Worker: Closing xapian database');
      if (this.api) {
        console.log('Worker: API exists?');
        this.api.closeXapianDatabase();
      }

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

      console.log('Worker: Closing indexed dbs');
      // ---- Hack for emscripten not closing databases
      Object.keys(IDBFS.dbs).forEach(k => IDBFS.dbs[k].close());
      IDBFS.dbs = {};

      // ----------------------

      new Observable(o => {
        // console.log('Worker: Deleting indexeddb database', '/' + this.localdir);
        const req = self.indexedDB.deleteDatabase('/' + this.localdir);
        req.onsuccess = () =>
          o.next();
      }).pipe(
        mergeMap(() =>
          new Observable(o => {
            // console.log('Worker: Deleting indexeddb database', this.partitionsdir);
            const req = self.indexedDB.deleteDatabase(this.partitionsdir);
            req.onsuccess = () =>
              o.next();
          })
        )
      ).subscribe(() => {
        ctx.postMessage({'action': PostMessageAction.indexDeleted});
        observer.next();
      });
    });
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

        const latestSearchIndexDate = new Date(dateParts[1], dateParts[2] - 1, dateParts[3]);
        console.log('Worker: Latest search index date is', latestSearchIndexDate);
        this.indexLastUpdateTime = latestSearchIndexDate.getTime();
      } catch (e) {
        console.log('Worker: Corrupt Xapian index', e);
        // this.indexLastUpdateTime = 0;
        this.indexLastUpdateTime = new Date().getTime();
        return false;
      }
    } else {
      this.indexLastUpdateTime = 0;
      // console.log('Worker: Empty Xapian index');
    }
    return true;
  }

  async compareAndUpdateFolderCounts(
    currentFolder: FolderListEntry,
    numberOfMessages: number,
    numberOfUnreadMessages: number): Promise<any[]> {
    let folderMessages = [];
    if (
      numberOfMessages !== currentFolder.totalMessages ||
        numberOfUnreadMessages !== currentFolder.newMessages) {
      console.log(`number of messages
(${numberOfMessages} vs ${currentFolder.totalMessages} and
(${numberOfUnreadMessages} vs ${currentFolder.newMessages})
not matching with index for current folder`);

      try {
        folderMessages = await listAllMessages(
          0, 0, 0,
          MAX_DISCREPANCY_CHECK_LIMIT,
          true, currentFolder.folderPath);
      } catch (err) {
        console.error(err);
        if (typeof(err) !== 'string' && err.hasOwnProperty('errors')) {
          console.log(err.errors);
        }
      }

      const folderMessageIDS: {[messageId: number]: boolean} = {};
      folderMessages.forEach(msg => folderMessageIDS[msg.id] = true);

      const indexFolderResults = this.api.sortedXapianQuery(
        this.getFolderQuery('', currentFolder.folderPath, false), 0, 0, 0, MAX_DISCREPANCY_CHECK_LIMIT, -1
      );
      indexFolderResults.forEach((searchResultRow: number[]) => {
        const docdataparts = this.api.getDocumentData(searchResultRow[0]).split('\t');
        const rmmMessageId = parseInt(docdataparts[0].substring(1), 10);

        if (!folderMessageIDS[rmmMessageId]) {
          /*
           * For messages present in the index but not in the server folder list, request index verification from the server -
           * which means that the server either will update the changeddate timestamp of the message, or the deleted timestamp
           * if the message was deleted.
           */
          this.pendingIndexVerifications[rmmMessageId] = {
            id: docdataparts[0],
            folder: currentFolder.folderPath
          } as SearchIndexDocumentData;
        }
      });
      // console.log(folderMessages);
    }
    return folderMessages;
  }

  /**
   * Polling loop (every 10th sec)
   */
  async updateIndexWithNewChanges(next_update?: {
    start_message: string,
    list_messages_args: [number, number, number, number, boolean, string?],
    set_next_update_time: boolean }) {
    clearTimeout(this.indexUpdateIntervalId);

    // console.log('Worker: updateIndexWithNewChanges');

    if (next_update == null) {
      next_update = {
        start_message: 'Worker: Getting latest messages from server after ' + (new Date(this.indexLastUpdateTime)).toString(),
        list_messages_args: [0, 0, this.indexLastUpdateTime, LIST_ALL_MESSAGES_CHUNK_SIZE, true],
        set_next_update_time: true,
      };
    }
    console.log(next_update['start_message']);

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
      const filteredpendingIndexVerificationsArray = pendingIndexVerificationsArray
        .filter(msgobj => Number.isInteger(msgobj.id));

      if (filteredpendingIndexVerificationsArray.length > 0) {
        await fetch('/rest/v1/searchindex/verifymessages',
                    { method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(
                        {
                          indexEntriesToVerify: filteredpendingIndexVerificationsArray
                        }
                      )
                    });
      }

      let msginfos = [];
      try {
        msginfos = await listAllMessages(...next_update['list_messages_args']);
      } catch (err) {
        console.error(err);
        if (typeof(err) !== 'string' && err.hasOwnProperty('errors')) {
          console.log(err.errors);
        }
      }

      if (this.currentIndexUpdateMessageIds.size > 0) {
        // if an index update is already running, check we arent
        // updating the same messages

        const notIn = msginfos.filter((msg) => !this.currentIndexUpdateMessageIds.has(msg.id));
        if (notIn.length !== msginfos.length) {
          console.log('Worker: Attempted to update index data that was already in progress, skipping');
          msginfos = [];
        }
      }
      msginfos.forEach((msg) => this.currentIndexUpdateMessageIds.add(msg.id));

      const deletedMessages = await listDeletedMessagesSince(
        new Date(
          // Subtract timezone offset to get UTC
          this.indexLastUpdateTime - new Date().getTimezoneOffset() * 60 * 1000)
      );

        if (this.numberOfMessagesSyncedLastTime === 0) {
          // nothing else to do, check for folder count discrepancies

          const currentFolder = this.folderList.find(folder => folder.folderPath === this.currentFolder);
          const folderPath = currentFolder.folderPath;

          // do this once per folder, and only if the folder is actually indexed
          if (!this.folderCountDiscrepanciesCheckedCount[folderPath]) {
            this.folderCountDiscrepanciesCheckedCount[folderPath] = 1;

            // Compare xapian index counts with rest api folder list:
            if (this.localSearchActivated && this.api &&
              this.api.listFolders().find(f => f[0] === folderPath)
               ) {
              const [numberOfMessages, numberOfUnreadMessages] = this.api.getFolderMessageCounts(folderPath);
              const folderMessages = await this.compareAndUpdateFolderCounts(currentFolder, numberOfMessages, numberOfUnreadMessages);
              msginfos = msginfos.concat(folderMessages);
            } else {
              // Compare rest api counts with rest api folder list:
              folderStats(folderPath).then((stats: FolderStatsEntry) => {
                if (stats &&
                  stats.total !== currentFolder.totalMessages ||
                    stats.total_unseen !== currentFolder.newMessages) {
                  console.log(`number of messages
(${stats.total} vs ${currentFolder.totalMessages} and
(${stats.total_unseen} vs ${currentFolder.newMessages})
not matching with rest api counts for current folder`);
                  updateFolderCounts(folderPath).then(
                    (result) => console.log(result.result.result.msg)
                  ).catch(
                    (err) => console.log('Error updating folder counts: ' + err.errors.join(','))
                  );
                }
              });
            }
          }
        }
      if (this.localSearchActivated) {
        const searchIndexDocumentUpdates: SearchIndexDocumentUpdate[] = [];

        deletedMessages.forEach(msgid => {
          const uniqueIdTerm = `Q${msgid}`;
          const docid = this.api.getDocIdFromUniqueIdTerm(uniqueIdTerm);
          if (docid !== 0) {
            searchIndexDocumentUpdates.push(
              new SearchIndexDocumentUpdate(msgid, async () => {
                try {
                  this.api.deleteDocumentByUniqueTerm(uniqueIdTerm);
                } catch (e) {
                  console.error('Worker: Unable to delete message from index', msgid);
                }
              })
            );
          }
        });

        const folders = this.folderList;

        msginfos.forEach(msginfo => {
            const uniqueIdTerm = `Q${msginfo.id}`;
            let msgIsTrashed = false;
            const docid = this.api.getDocIdFromUniqueIdTerm(uniqueIdTerm);
            if (
              docid === 0 && // document not found in the index
                !this.unindexedFolders.includes(msginfo.folder)
            ) {
              searchIndexDocumentUpdates.push(
                new SearchIndexDocumentUpdate(msginfo.id, async () => {
                  try {
                    this.indexingTools.addMessageToIndex(
                      msginfo, this.unindexedFolders
                    );
                    // Add term about missing body text so that later stage can add this
                    this.api.addTermToDocument(`Q${msginfo.id}`, XAPIAN_TERM_MISSING_BODY_TEXT);
                    if (msginfo.deletedFlag) {
                      this.api.addTermToDocument(`Q${msginfo.id}`, XAPIAN_TERM_DELETED);
                    }
                  } catch (e) {
                    console.error('Worker: failed to add message to index', msginfo, e);
                  }
                })
              );
            } else if (docid !== 0) {
              this.api.documentXTermList(docid);
              const messageStatusInIndex = {
                flagged: false,
                seen: false,
                answered: false,
                deleted: false,
                attachments: false
              };
              const documentTermList = (Module.documenttermlistresult as string[]);
              const addSearchIndexDocumentUpdate = (func: () => void) =>
                searchIndexDocumentUpdates.push(
                  new SearchIndexDocumentUpdate(msginfo.id, async () => {
                    try {
                      func();
                    } catch (err) {
                      console.error('Worker: Error updating doc in searchindex', msginfo, documentTermList, err);
                    }
                  }
                  )
                );
              documentTermList.forEach(term => {
                if (term.indexOf(XAPIAN_TERM_FOLDER) === 0 &&
                  term.substr(XAPIAN_TERM_FOLDER.length) !== msginfo.folder) {
                    // Folder changed
                    const destinationFolder = folders.find(folder => folder.folderPath === msginfo.folder);
                    if (destinationFolder && (destinationFolder.folderType === 'spam' || destinationFolder.folderType === 'trash') || destinationFolder.folderType === 'templates') {
                      addSearchIndexDocumentUpdate(() => this.api.deleteDocumentByUniqueTerm(uniqueIdTerm));
                      msgIsTrashed = true;
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
                } else if (term === XAPIAN_TERM_HASATTACHMENTS) {
                  messageStatusInIndex.attachments = true;
                }
              });

              if (!msgIsTrashed) {
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

                if (msginfo.attachment && !messageStatusInIndex.attachments) {
                    addSearchIndexDocumentUpdate(() =>
                      this.api.addTermToDocument(uniqueIdTerm, XAPIAN_TERM_HASATTACHMENTS));
                  } else if (!msginfo.attachment && messageStatusInIndex.attachments) {
                    addSearchIndexDocumentUpdate(() =>
                      this.api.removeTermFromDocument(uniqueIdTerm, XAPIAN_TERM_HASATTACHMENTS));
                  }
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
                  // const msg = (await this.rmmapi.getMessageContents(messageId).toPromise());
                  // const msg = { 'status' : 'success', 'text': { 'text': 'nuttin to see here' } };
                  // Sent over from main thread, when we load messagecontents
                  // for the current items in view
                  // (not quite as good as fetching content for all index updates!)
                  // this could be a sep api? (id => text)
                  if (this.messageTextCache.has(messageId)) {
                    const text = this.messageTextCache.get(messageId);
                  // if (msg.status === 'success') {
                    if (text) {
                      this.api.addTextToDocument(docIdTerm, true, text);
                    }
                    // There may have been known backend warnings, so
                    // don't keep repeating the attempt
                  }
                  this.api.removeTermFromDocument(docIdTerm, XAPIAN_TERM_MISSING_BODY_TEXT);
                } catch (e) {
                  console.error('Worker: Failed to add text to document', messageId, e);
                }
              });
            })).toPromise();
          }
      } else {
        // localsearchactivated is off
        this.numberOfMessagesSyncedLastTime = msginfos.filter((msg) => msg.changedDate > new Date(this.indexLastUpdateTime)).length;
      }

      if (msginfos && msginfos.length > 0) {
        // Notify on new messages
        const newmessages = msginfos.filter(m =>
          !m.seenFlag &&
          m.folder === 'Inbox' &&
          m.messageDate.getTime() > this.indexLastUpdateTime);
        if (newmessages.length > 0) {
          postMessage({'action': PostMessageAction.newMessagesNotification,
                       'newMessages': newmessages });
        }
      }

      console.log(`Updating messageListService with # mesgs: ${msginfos.length}, new sync: ${this.numberOfMessagesSyncedLastTime}`);
      if ((msginfos && msginfos.length > 0)
        || (deletedMessages && deletedMessages.length > 0)) {
        if (this.numberOfMessagesSyncedLastTime) {
          // notify messagelist that changes were made, regardless of
          // whether we updated the index or notauthenticated
          // if index is on this only affects trash/spam
          // otherwise its the update for all folders
          const folders = new Set;
          msginfos.forEach((msg) => folders.add(msg.folder));
          // only got ids for deleted messages
          // deletedMessages.forEach((msg) => folders.add(msg.folder));
          ctx.postMessage({'action': PostMessageAction.updateMessageListService,
                          'foldersUpdated': Array.from(folders) });
        }
        // Update folder lists + counts
        // postMessage
        // this.messagelistservice.applyChanges(
        //   msginfos ? msginfos : [],
        //   deletedMessages ? deletedMessages : []
        // );

        // Find latest date in result set and use as since parameter for getting new changes from server

        if (next_update['set_next_update_time']) {
          let newLastUpdateTime = 0;
          msginfos.forEach(msginfo => {
            if (msginfo.changedDate && msginfo.changedDate.getTime() > newLastUpdateTime) {
              newLastUpdateTime = msginfo.changedDate.getTime();
            }
            if (msginfo.messageDate && msginfo.messageDate.getTime() > newLastUpdateTime) {
              newLastUpdateTime = msginfo.messageDate.getTime();
            }
          });
          // In case we get emails with dates far in the future!
          if (newLastUpdateTime > new Date().getTime()) {
            newLastUpdateTime = new Date().getTime();
          }
          if (newLastUpdateTime > this.indexLastUpdateTime) {
            this.indexLastUpdateTime = newLastUpdateTime;
          }
        }
      }
    } catch (err) {
      console.error('Worker: Failed updating with new changes (will retry in 10 secs)', err);
      if (this.messageProcessingInProgressSubject &&
        this.messageProcessingInProgressSubject.isStopped) {
        // stopped/errored because localSearchActivated changed
        // during processing, reset
        this.messageProcessingInProgressSubject = null;
        this.pendingMessagesToProcess = null;
        this.processMessageHistoryProgress = null;
        this.processMessageIndex = 0;
      }
    }
    this.currentIndexUpdateMessageIds.clear();
    // FIXME: postMessage ?
    // this.notifyOnNewMessages = true;
    this.indexUpdateIntervalId = setTimeout(() => this.updateIndexWithNewChanges(), 10000);
  }

  persistIndex(): Observable<boolean> {
    // console.log(`Persist: ${this.indexNotPersisted} localSearch: ${this.localSearchActivated}`);
    if (!this.indexNotPersisted || !this.localSearchActivated) {
      return of(false);
    } else {
      if (!this.persistIndexInProgressSubject) {
        this.persistIndexInProgressSubject = new AsyncSubject();

        console.log('Worker: Persisting to indexeddb');

        FS.writeFile('indexLastUpdateTime', '' + this.indexLastUpdateTime, { encoding: 'utf8' });
        FS.syncfs(false, () => {
          // console.log('Worker: Syncd files:');
          // console.log(FS.stat(XAPIAN_GLASS_WR));
          FS.readdir(this.partitionsdir).forEach((f) => {
            // console.log(`${f}`);
            // console.log(FS.stat(`${this.partitionsdir}/${f}`));
          });
            this.persistIndexInProgressSubject.next(true);
            this.persistIndexInProgressSubject.complete();
            this.persistIndexInProgressSubject = null;
            this.indexNotPersisted = false;
            console.log('Worker: Done persisting to indexeddb');
        });
      }
      return this.persistIndexInProgressSubject;
    }
  }

    postMessagesToXapianWorker(newMessagesToProcess: SearchIndexDocumentUpdate[]): Observable<any> {
    if (!this.localSearchActivated) {
      return of();
    }

    if (!this.pendingMessagesToProcess) {
      this.pendingMessagesToProcess = newMessagesToProcess;
      this.messageProcessingInProgressSubject = new AsyncSubject();

      const getProgressSnackBarMessageText = () => `Syncing ${this.processMessageIndex} / ${this.pendingMessagesToProcess.length}`;
      let hasProgressSnackBar = false;
      if (this.pendingMessagesToProcess.length > 10) {
        hasProgressSnackBar = true;
        ctx.postMessage({'action': PostMessageAction.openProgressSnackBar });
        ctx.postMessage({'action': PostMessageAction.updateProgressSnackBar, 'value': getProgressSnackBarMessageText() });
      }

      const processMessage = async () => {
        if (!this.localSearchActivated) {
          // Handle that index is deleted in the middle of an indexing process
          this.messageProcessingInProgressSubject.error('Worker: Search index deleted in the middle of indexing process');
          return;
        } else if (this.processMessageIndex < this.pendingMessagesToProcess.length) {
          this.processMessageHistoryProgress = Math.round(this.processMessageIndex * 100 / this.pendingMessagesToProcess.length);

          console.log('Worker: Adding to (or removing from) index', (this.pendingMessagesToProcess.length - this.processMessageIndex), 'to go');
          if (hasProgressSnackBar) {
            ctx.postMessage({'action': PostMessageAction.updateProgressSnackBar, 'value': getProgressSnackBarMessageText() });
          }

          // TODO: it'd be more efficient to just update the cache instead of forcing the redownload
          ctx.postMessage({'action': PostMessageAction.refreshContentCache,
                           'messageId': this.pendingMessagesToProcess[this.processMessageIndex].id});

          const nextMessage = this.pendingMessagesToProcess[this.processMessageIndex++];
          await nextMessage.updateFunction();

          if (this.persistIndexInProgressSubject) {
            // Wait for persistence of index to finish before doing more work on the index
            await this.persistIndexInProgressSubject.toPromise();
          }
          setTimeout(() => processMessage(), 1);

        } else {
          console.log('Worker: All messages added');
          if (this.processMessageIndex > 0) {
            this.processMessageIndex = 0;
            this.indexNotPersisted = true;
          }
          this.api.commitXapianUpdates();
          await this.persistIndex().toPromise();

          if (hasProgressSnackBar) {
            ctx.postMessage({'action': PostMessageAction.closeProgressSnackBar});
            hasProgressSnackBar = false;
          }

          this.processMessageHistoryProgress = null;
          this.pendingMessagesToProcess = null;

          this.messageProcessingInProgressSubject.next(true);
          this.messageProcessingInProgressSubject.complete();
          this.messageProcessingInProgressSubject = null;

          ctx.postMessage({'action': PostMessageAction.indexUpdated});
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
   * Move messages instantly in the local index (this does not affect server,
   * so the server must also be updated separately)
   * @param messageIds
   * @param destinationfolderPath
   */
  moveMessagesToFolder(messageIds: number[], destinationfolderPath: string) {
    if (!this.api || !this.localSearchActivated) {
      return;
    }
    of(this.folderList)
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
              // console.log(`moving message ${mid} to ${dotSeparatedDestinationfolderPath}`);
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
    if (!this.api || !this.localSearchActivated) {
      return;
    }
    this.postMessagesToXapianWorker(messageIds.map(mid =>
      new SearchIndexDocumentUpdate(mid, () =>
            this.api.deleteDocumentByUniqueTerm('Q' + mid)
          )
        )
    );
  }
}

const searchIndexService = new SearchIndexService();

ctx.addEventListener('message', ({ data }) => {
  console.log('Message to worker ');
  console.log(data['action']);
  try {
    if (data['action'] === PostMessageAction.opendb) {
      searchIndexService.localdir = data['localdir'];
      searchIndexService.partitionsdir = data['partitionsdir'];
      const idbrequest: IDBOpenDBRequest =
        self.indexedDB.open('/' + data['localdir']);
      idbrequest.onsuccess = () => {
        searchIndexService.loadSearchIndexes(idbrequest.result).subscribe(
          result => {
            // main threead is also opening it so we dont need to report back
            // console.log('Worker: loaded search indexes ', result);
            // ctx.postMessage(result);
          },
        );
      };
    } else if (data['action'] === PostMessageAction.updateIndexWithNewChanges) {
      searchIndexService.updateIndexWithNewChanges(data['args']);
    } else if (data['action'] === PostMessageAction.stopIndexUpdates) {
      clearTimeout(searchIndexService.indexUpdateIntervalId);
    } else if (data['action'] === PostMessageAction.deleteLocalIndex) {
      // console.log('Worker: deleting local index...');
      searchIndexService.deleteLocalIndex().subscribe(() => {
        // console.log('Worker: sub to local index delete');
        searchIndexService.updateIndexWithNewChanges();
      });
    } else if (data['action'] === PostMessageAction.folderListUpdate) {
      searchIndexService.folderList = data['value'];
    } else if (data['action'] === PostMessageAction.messageCache) {
      // Add / update the text of a message which we can add to the search index
      const updates = data['updates'];
      updates.forEach((val, key) => searchIndexService.messageTextCache.set(key, val));
    } else if (data['action'] === PostMessageAction.moveMessagesToFolder) {
      searchIndexService.moveMessagesToFolder(data['messageIds'], data['value']);
    } else if (data['action'] === PostMessageAction.deleteMessages) {
      searchIndexService.deleteMessages(data['messageIds']);
    } else if (data['action'] === PostMessageAction.addMessageToIndex) {
      const searchIndexDocumentUpdates: SearchIndexDocumentUpdate[] = [];

      data['msginfos'].forEach((msgInfo) => {
        searchIndexDocumentUpdates.push(
          new SearchIndexDocumentUpdate(msgInfo.id, async () => {
            try {
              searchIndexService.indexingTools.addMessageToIndex(msgInfo);
            } catch (e) {
              console.error(e);
            }
          }));
      });
      if (searchIndexDocumentUpdates.length > 0 && searchIndexService.localSearchActivated) {
        searchIndexService.postMessagesToXapianWorker(searchIndexDocumentUpdates);
      }
    } else if (data['action'] === PostMessageAction.addTermToDocument) {
      if (searchIndexService.localSearchActivated) {
      searchIndexService.postMessagesToXapianWorker([
        new SearchIndexDocumentUpdate(data['messageId'], async () => {
          try {
            searchIndexService.api.addTermToDocument(`Q${data['messageId']}`, data['term']);
          } catch (e) {
            console.error(`Failed to add ${data['term']} to ${data['messageId']}`);
            console.error(e);
          }
        }) ]);
      }
    } else if (data['action'] === PostMessageAction.removeTermFromDocument) {
      if (searchIndexService.localSearchActivated) {
      searchIndexService.postMessagesToXapianWorker([
        new SearchIndexDocumentUpdate(data['messageId'], async () => {
          try {
            searchIndexService.api.removeTermFromDocument(`Q${data['messageId']}`, data['term']);
          } catch (e) {
            console.error(`Failed to remove ${data['term']} from ${data['messageId']}`);
            console.error(data['term']);
            console.error(data['messageId']);
            console.error(e);
          }
        }) ]);
      }
    } else if (data['action'] === PostMessageAction.setCurrentFolder) {
      searchIndexService.currentFolder = data['folder'];
    }
    console.log('Dealt with message');
  } catch (e) {
    console.error('Failed to deal with message: ' + e);
  }
});

