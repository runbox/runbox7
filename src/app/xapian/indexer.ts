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

import { XapianAPI } from '@runboxcom/runbox-searchindex';
import { MessageInfo, IndexingTools } from '../common/messageinfo';
import { Subject } from 'rxjs';

declare let IDBFS;
declare let FS;
declare let Module;

export class Indexer {
    static xapianScriptElm: HTMLScriptElement;

    public messageSubject: Subject<any> = new Subject();
    public xapian: XapianAPI;
    private addToMailIndexSubject: Subject<any>;

    constructor() {

    }

    public init() {
        if (Indexer.xapianScriptElm) {
            return;
        }
        console.log('Loading Xapian');
        Indexer.xapianScriptElm = document.createElement('script');
        Indexer.xapianScriptElm.src = 'xapianasm.js';
        Indexer.xapianScriptElm.onload = () => {
            console.log('Waiting for runtime to be initialized');
            Module['onRuntimeInitialized'] = () => {
                console.log('Xapian ready');
                this.messageSubject.next('XapianReady');
            };
        };
        document.body.appendChild(Indexer.xapianScriptElm);

    }

    public onMessage(msg: any) {
        if (this.addToMailIndexSubject) {
            this.addToMailIndexSubject.next(msg);
        } else {
            console.log('Got msg', msg);
            if (!msg.data.xapiandatabasedir || msg.data.xapiandatabasedir.length === 0) {
                return;
            }
            const xapiandatabasedir: string = msg.data.xapiandatabasedir;
            FS.mkdir(xapiandatabasedir);
            FS.mount(IDBFS, {}, '/' + xapiandatabasedir);
            FS.chdir('/' + xapiandatabasedir);

            console.log('Local dir is ' + xapiandatabasedir);

            FS.syncfs(true, (err) => {
                console.log('File sys ready');
                this.xapian = new XapianAPI();
                const indexingTools = new IndexingTools(this.xapian);

                this.xapian.initXapianIndex('xapianglasswr');

                /**
                 * This merging takes too long time to do on the client

                try {
                    FS.stat("xapianglass");
                    console.log("Merging single file database");
                    this.xapian.addSingleFileXapianIndex("xapianglass");
                    this.xapian.compactToWritableDatabase("xapianglasswrtmp");
                    this.xapian.closeXapianDatabase();
                    FS.readdir("xapianglasswr").forEach((f) => {
                    if(f!=="." && f!=="..") {
                        console.log(f);
                        FS.unlink("xapianglasswr/"+f);
                    }
                    });
                    FS.rmdir("xapianglasswr");
                    FS.unlink("xapianglass");
                    FS.rename("xapianglasswrtmp","xapianglasswr");
                    this.xapian.initXapianIndex("xapianglasswr");
                    console.log("Single file database merged");
                } catch(e) {

                }
                */

                let docCount: number = this.xapian.getXapianDocCount();
                console.log(docCount + ' docs in Xapian database');
                let indexingInProgress = false;
                const addToMailIndexQueue: MessageInfo[] = [];
                let lastProgressNotification: number = new Date().getTime();

                let startingWithEmptyIndex = false;
                if (docCount === 0) {
                    startingWithEmptyIndex = true;
                }

                const doIndexing = () => {
                    if (indexingInProgress || addToMailIndexQueue.length === 0) {
                        return;
                    }

                    indexingInProgress = true;
                    let initialQueueSize: number = addToMailIndexQueue.length;
                    while (addToMailIndexQueue.length > 0) {
                        const msginfo: MessageInfo = addToMailIndexQueue.shift();

                        // console.log("Adding message id ", msginfo.id);
                        indexingTools.addMessageToIndex(msginfo);
                        // console.log(this.xapian.getXapianDocCount());
                        if (new Date().getTime() - lastProgressNotification > 500) {
                            if (addToMailIndexQueue.length > initialQueueSize) {
                                initialQueueSize = addToMailIndexQueue.length;
                            }
                            console.log(addToMailIndexQueue.length + ' elements left in indexing queue');
                            this.messageSubject.next(['IndexingProgress',
                                addToMailIndexQueue.length,
                                initialQueueSize,
                                this.xapian.getXapianDocCount()]);
                            lastProgressNotification = new Date().getTime();

                            if (startingWithEmptyIndex) {
                                startingWithEmptyIndex = false;
                                break;
                            }
                        }
                    }

                    docCount = this.xapian.getXapianDocCount();
                    console.log(docCount + ' docs in Xapian database');
                    console.log('Indexing done');
                    this.xapian.commitXapianUpdates();
                    FS.syncfs(false, () => {
                        this.messageSubject.next('IndexingDone');
                        indexingInProgress = false;
                        if (addToMailIndexQueue.length > 0) {
                            doIndexing();
                        }
                    });
                };


                this.addToMailIndexSubject = new Subject();
                this.addToMailIndexSubject.subscribe((themessage) => {
                    if (themessage.data[0] === 'addToMailIndex') {
                        const mailSummaries: MessageInfo[] = themessage.data[1];
                        mailSummaries.forEach((ms) => addToMailIndexQueue.push(ms));
                        doIndexing();
                    }
                });

                this.messageSubject.next('IndexerReady');
            });

        }
    }
}
