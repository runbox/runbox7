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

import { SearchService, XAPIAN_GLASS_WR } from './searchservice';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RunboxWebmailAPI, RunboxMe } from '../rmmapi/rbwebmail';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { MessageListService } from '../rmmapi/messagelist.service';
import { XapianAPI } from 'runbox-searchindex/rmmxapianapi';
import { xapianLoadedSubject } from './xapianwebloader';
import { PostMessageAction } from './messageactions';
import { MessageCache } from '../rmmapi/messagecache';

declare var FS;
declare var IDBFS;

describe('SearchService', () => {

    let httpMock: HttpTestingController;

    const listEmailFoldersResponse = {
        'status': 'success',
        'result': {
            'folders': [
                {
                    'old': 296,
                    'name': 'Inbox',
                    'priority': '0',
                    'id': '1',
                    'parent': null,
                    'new': 0,
                    'total': 296,
                    'folder': 'Inbox',
                    'msg_new': 0,
                    'msg_total': 296,
                    'size': '11389678',
                    'msg_size': '11389678',
                    'subfolders': [],
                    'type': 'inbox'
                },
                {
                    'old': 296,
                    'name': 'Spam',
                    'priority': '0',
                    'id': '2',
                    'parent': null,
                    'new': 0,
                    'total': 296,
                    'folder': 'Spam',
                    'msg_new': 0,
                    'msg_total': 296,
                    'size': '11389678',
                    'msg_size': '11389678',
                    'subfolders': [],
                    'type': 'spam'
                },
                {
                    'old': 296,
                    'name': 'Trash',
                    'priority': '0',
                    'id': '2',
                    'parent': null,
                    'new': 0,
                    'total': 296,
                    'folder': 'Trash',
                    'msg_new': 0,
                    'msg_total': 296,
                    'size': '11389678',
                    'msg_size': '11389678',
                    'subfolders': [],
                    'type': 'trash'
                },
            ]
        }
    };

    beforeAll(function() {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 999999;
    });

    beforeEach((() => {
        TestBed.configureTestingModule({
          imports: [
            HttpClientTestingModule,
            MatSnackBarModule,
            MatDialogModule
          ],
            providers: [
                SearchService,
                MessageCache,
                MessageListService,
                RunboxWebmailAPI
                // { provide: Worker, useValue: {
                //     onmessage({ data }) { console.log(data); },
                //     postMessage({ data }) { console.log(data); }
                // }
                // }
          ]
        });

        httpMock = TestBed.inject(HttpTestingController as Type<HttpTestingController>);
    }));

    it('should load searchservice, but no local index', async () => {
        const searchService = TestBed.inject(SearchService);
        await xapianLoadedSubject.toPromise();

        let req = httpMock.expectOne(`/rest/v1/me`);
        req.flush( { result: {
                uid: 555
            } as RunboxMe
        });
        req = httpMock.expectOne('/rest/v1/email_folder/list');
        req.flush(listEmailFoldersResponse);
        req = httpMock.expectOne('/rest/v1/last_on');
        req.flush({'status': 'success'});

        expect(await searchService.initSubject.toPromise()).toBeFalsy();
        expect(searchService.localSearchActivated).toBeFalsy();
        httpMock.verify();

        await new Promise(resolve => setTimeout(resolve, 100));

        const messageListService = TestBed.inject(MessageListService);
        expect(messageListService.trashFolderName).toEqual('Trash');
        expect(messageListService.spamFolderName).toEqual('Spam');
        expect(messageListService.folderListSubject.value.length).toBe(3);

        expect(messageListService.staleFolders['Sentry']).toBeFalsy();
        searchService.indexWorker.onmessage(new MessageEvent(
            'message',
            { 'data': {
              'action': PostMessageAction.updateMessageListService,
              'foldersUpdated': ['Sentry']
            }}));
        expect(messageListService.staleFolders['Sentry']).toBeTruthy();
        // httpMock.verify();
        // req = httpMock.expectOne(mockrequest =>
        //     mockrequest.urlWithParams.indexOf('/mail/download_xapian_index?' +
        //     'listallmessages=1&page=0&sinceid=0&sincechangeddate=' + Math.floor(searchService.indexLastUpdateTime / 1000) +
        //     '&pagesize=' + RunboxWebmailAPI.LIST_ALL_MESSAGES_CHUNK_SIZE + '&skipcontent=1&avoidcacheuniqueparam=') === 0);

        // const testMessageId = 3463422;
        // const testMessageTime = searchService.indexLastUpdateTime + 1;
        // message time must be later so that indexLastUpdateTime is updated
        // req.flush(testMessageId + '\t' + testMessageTime + '\t1561389614\tInbox\t1\t0\t0\t' +
        //     'Cloud Web Services <cloud-marketing-email-replies@cloudsuperhosting.com>\ttest@example.com	Analyse Data at Scale\ty');

        // expect(messageListService.staleFolders['Inbox']).toBeTruthy();
        // const sincechangeddate = new Date(searchService.indexLastUpdateTime - new Date().getTimezoneOffset() * 60 * 1000);
        // const datestring = sincechangeddate.toJSON().replace('T', ' ').substr(0, 'yyyy-MM-dd HH:mm:ss'.length);

        // await new Promise(resolve => setTimeout(resolve, 100));
        // req = httpMock.expectOne(`/rest/v1/list/deleted_messages/${datestring}`);
        // req.flush({
        //     message_ids: []
        // });
        // await new Promise(resolve => setTimeout(resolve, 100));

        // console.log('Test messagesById');
        // console.log(messageListService.messagesById[testMessageId]);
        // expect(messageListService.messagesById[testMessageId]).toBeTruthy();

        // console.log('Test indexUpdateIntervalId');
        // console.log(searchService.indexUpdateIntervalId);
        // expect(searchService.indexUpdateIntervalId).toBeTruthy();
        // clearTimeout(searchService.indexUpdateIntervalId);

        await new Promise(resolve => {
            console.log('Deleting database');
            const idbreq = window.indexedDB.deleteDatabase('/' + searchService.localdir);
            idbreq.onsuccess = () => resolve(null);
        });

        console.log('deleted db', searchService.localdir);
        FS.chdir('/');
    });

    xit('should create local index and load searchservice', async () => {
        const testuserid = 444;
        const localdir =  'rmmsearchservice' + testuserid;

        await xapianLoadedSubject.toPromise();

        FS.mkdir(localdir);
        FS.mount(IDBFS, {}, '/' + localdir);
        FS.chdir('/' + localdir);

        const xapianapi = new XapianAPI();
        xapianapi.initXapianIndex(XAPIAN_GLASS_WR);
        const visibleFrom = 'Test person';
        xapianapi.addSortableEmailToXapianIndex(
            'Q' + 22,
            visibleFrom,
            visibleFrom.toUpperCase(),
            'test@example.com',
            'recipient@example',
            'Testsubject',
            'testsubject222',
            '20190223123322',
            22,
            'Message text content',
            'Inbox',
            false,
            false,
            false,
            false
        );
        xapianapi.commitXapianUpdates();
        xapianapi.closeXapianDatabase();
        const indexLastUpdateTime = new Date().getTime() - 60000;
        FS.writeFile('indexLastUpdateTime', '' +  indexLastUpdateTime, { encoding: 'utf8' });

        await new Promise(resolve => FS.syncfs(false, resolve));
        console.log('index created using ' + indexLastUpdateTime);

        FS.chdir('..');
        FS.unmount('/' + localdir);
        FS.rmdir(localdir);

        // Close indexeddb
        Object.keys(IDBFS.dbs).forEach(k => IDBFS.dbs[k].close());
        IDBFS.dbs = {};

        const searchService = TestBed.inject(SearchService);
        let req = httpMock.expectOne(`/rest/v1/me`);
        req.flush( { result: {
                uid: testuserid
            } as RunboxMe
        });

        req = httpMock.expectOne('/rest/v1/email_folder/list');
        req.flush(listEmailFoldersResponse);


        expect(await searchService.initSubject.toPromise()).toBeTruthy();
        expect(searchService.localSearchActivated).toBeTruthy();
        expect(localdir).toEqual(searchService.localdir);

        expect(indexLastUpdateTime).toEqual(searchService.indexLastUpdateTime);

        await new Promise(resolve => setTimeout(resolve, 100));

        const messageListService = TestBed.inject(MessageListService);
        expect(messageListService.trashFolderName).toEqual('Trash');
        expect(messageListService.spamFolderName).toEqual('Spam');
        expect(messageListService.folderListSubject.value.length).toBe(3);

        const testMessageId = 3463499;
        await new Promise(resolve => setTimeout(resolve, 100));
        req = httpMock.expectOne(mockrequest =>
                mockrequest.urlWithParams.indexOf('/mail/download_xapian_index?' +
            'listallmessages=1&page=0&sinceid=0&sincechangeddate=' + Math.floor(indexLastUpdateTime / 1000) +
            '&pagesize=' + RunboxWebmailAPI.LIST_ALL_MESSAGES_CHUNK_SIZE + '&skipcontent=1&avoidcacheuniqueparam=') === 0);
        // message timestamps are in seconds:
        // message time must be later so that indexLastUpdateTime is updated
        const testMessageTime = Math.round(indexLastUpdateTime / 1000) + 2;
        console.log('testMessageTime now ' + testMessageTime);
        req.flush(testMessageId + '\t' +  testMessageTime + '\t' + testMessageTime + '\tInbox\t1\t0\t0\t' +
            'Cloud Web Services <cloud-marketing-email-replies@cloudsuperhosting.com>\ttest@example.com	Analyse Data at Scale\ty');

        await new Promise(resolve => setTimeout(resolve, 1000));

        const sincechangeddate = new Date(indexLastUpdateTime - new Date().getTimezoneOffset() * 60 * 1000);
        const datestring = sincechangeddate.toJSON().replace('T', ' ').substr(0, 'yyyy-MM-dd HH:mm:ss'.length);

        req = httpMock.expectOne(`/rest/v1/list/deleted_messages/${datestring}`);
        req.flush({
            message_ids: []
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        expect(searchService.api.sortedXapianQuery('flag:missingbodytext', 0, 0, 0, 10, -1).length).toBe(1);

        await new Promise(resolve => setTimeout(resolve, 1000));

        req = httpMock.expectOne('/rest/v1/email/' + testMessageId);
        req.flush({
            status: 'success',
            result: {
                text: {
                    text: 'message body test text SecretSauceFormula'
                }
            }
        });

        await new Promise(resolve => setTimeout(resolve, 100));

        for (let n = 0; n < 10; n++) {
            if (indexLastUpdateTime !== searchService.indexLastUpdateTime) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        // Rounding fun:
        expect(Math.round(searchService.indexLastUpdateTime / 1000)).toBe( testMessageTime);

        expect(searchService.api.sortedXapianQuery('SecretSauceFormula', 0, 0, 0, 100, -1).length).toBe(1);
        expect(searchService.api.sortedXapianQuery('flag:missingbodytext', 0, 0, 0, 10, -1).length).toBe(0);
        expect(searchService.api.getXapianDocCount()).toBe(2);
        clearTimeout(searchService.indexUpdateIntervalId);

        FS.chdir('/');
        FS.unmount('/' + localdir);

        console.log(searchService.api.getXapianDocCount(), 'docs in xapian db');
    });
});
