// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2025 Runbox Solutions AS (runbox.com).
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

import { HttpResponse } from '@angular/common/http';
import { AsyncSubject, BehaviorSubject, Subject, of } from 'rxjs';

import { SearchService } from './searchservice';
import { PostMessageAction } from './messageactions';
import { FolderListEntry } from '../common/folderlistentry';

class FakeWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;
    postMessage = jasmine.createSpy('postMessage');

    constructor(..._args: any[]) {}
}

describe('SearchService index writer lock', () => {
    const lockKey = 'rmm7:index-writer-lock:test';
    let originalSetItem: typeof localStorage.setItem;
    let originalGetItem: typeof localStorage.getItem;

    beforeEach(() => {
        originalSetItem = localStorage.setItem.bind(localStorage);
        originalGetItem = localStorage.getItem.bind(localStorage);
        localStorage.removeItem(lockKey);
    });

    afterEach(() => {
        localStorage.removeItem(lockKey);
        localStorage.setItem = originalSetItem;
        localStorage.getItem = originalGetItem;
    });

    it('acquires and releases the index writer lock', () => {
        const service = Object.create(SearchService.prototype) as SearchService;
        (service as any)['indexWriterId'] = 'writer-1';
        service['indexWriterLockKey'] = lockKey;
        service['lockStorageAvailable'] = true;
        service['isIndexWriter'] = false;
        service['indexWriterRetryId'] = null;
        (service as any)['indexWriterLockTtlMs'] = 1000;
        service['startIndexWriterHeartbeat'] = jasmine.createSpy('startIndexWriterHeartbeat');
        service['stopIndexWriterHeartbeat'] = jasmine.createSpy('stopIndexWriterHeartbeat');
        service['maybeOpenDBOnWorker'] = jasmine.createSpy('maybeOpenDBOnWorker');

        expect(service['tryAcquireIndexWriterLock']()).toBeTrue();
        const stored = JSON.parse(localStorage.getItem(lockKey));
        expect(stored.id).toBe('writer-1');

        service['releaseIndexWriterLock']();
        expect(localStorage.getItem(lockKey)).toBeNull();
    });

    it('reclaims a stale lock from another writer', () => {
        const service = Object.create(SearchService.prototype) as SearchService;
        (service as any)['indexWriterId'] = 'writer-1';
        service['indexWriterLockKey'] = lockKey;
        service['lockStorageAvailable'] = true;
        service['isIndexWriter'] = false;
        service['indexWriterRetryId'] = null;
        (service as any)['indexWriterLockTtlMs'] = 1000;
        service['startIndexWriterHeartbeat'] = jasmine.createSpy('startIndexWriterHeartbeat');
        service['stopIndexWriterHeartbeat'] = jasmine.createSpy('stopIndexWriterHeartbeat');
        service['maybeOpenDBOnWorker'] = jasmine.createSpy('maybeOpenDBOnWorker');

        localStorage.setItem(lockKey, JSON.stringify({
            id: 'writer-older',
            ts: Date.now() - 2000
        }));

        expect(service['tryAcquireIndexWriterLock']()).toBeTrue();
        const stored = JSON.parse(localStorage.getItem(lockKey));
        expect(stored.id).toBe('writer-1');
    });

    it('disables lock handling when storage error occurs', () => {
        const service = Object.create(SearchService.prototype) as SearchService;
        service['lockStorageAvailable'] = true;
        service['isIndexWriter'] = true;
        service['indexWriterRetryId'] = 123;
        service['lockStorageErrorLogged'] = false;
        service['setIndexWriter'] = jasmine.createSpy('setIndexWriter');

        service['handleIndexWriterLockError'](new Error('storage blocked'));

        expect(service['lockStorageAvailable']).toBeFalse();
        expect(service['setIndexWriter']).toHaveBeenCalledWith(false);
        expect(service['indexWriterRetryId']).toBeNull();
    });
});

describe('SearchService index update hooks', () => {
    let originalWorker: any;
    let originalIndexedDbOpen: any;
    let originalInitIndexWriterLock: any;
    let originalFS: any;
    let openRequest: any;
    let fakeDb: any;
    let messageListStub: any;
    let rmmapiStub: any;

    beforeEach(() => {
        originalWorker = (window as any).Worker;
        (window as any).Worker = FakeWorker;

        originalFS = (window as any).FS;
        (window as any).FS = {
            syncfs: (_flag: boolean, callback: () => void) => callback(),
            readdir: () => []
        };

        originalInitIndexWriterLock = (SearchService.prototype as any).initIndexWriterLock;
        spyOn(SearchService.prototype as any, 'initIndexWriterLock').and.callFake(() => {});

        fakeDb = {
            objectStoreNames: { contains: () => false },
            close: jasmine.createSpy('close'),
            transaction: jasmine.createSpy('transaction')
        };
        openRequest = { result: fakeDb, onsuccess: null };
        originalIndexedDbOpen = window.indexedDB.open;
        spyOn(window.indexedDB, 'open').and.returnValue(openRequest);

        messageListStub = {
            searchservice: new AsyncSubject<SearchService>(),
            folderListSubject: new BehaviorSubject<FolderListEntry[]>([]),
            refreshFolderCounts: jasmine.createSpy('refreshFolderCounts'),
            refreshFolderList: jasmine.createSpy('refreshFolderList'),
            updateStaleFolders: jasmine.createSpy('updateStaleFolders'),
            fetchFolderMessages: jasmine.createSpy('fetchFolderMessages')
        };
        rmmapiStub = {
            me: of({ uid: 1, isExpired: () => false }),
            messageContentsInvalidated: new Subject<number>(),
            messageFlagChangeSubject: new Subject<any>()
        };
    });

    afterEach(() => {
        (window as any).Worker = originalWorker;
        (window as any).FS = originalFS;
        window.indexedDB.open = originalIndexedDbOpen;
        (SearchService.prototype as any).initIndexWriterLock = originalInitIndexWriterLock;
    });

    it('skips local index detection when FILE_DATA is missing', async () => {
        const service = new SearchService(
            rmmapiStub as any,
            { request: jasmine.createSpy('request') } as any,
            { openFromComponent: jasmine.createSpy('openFromComponent') } as any,
            { open: jasmine.createSpy('open') } as any,
            messageListStub as any
        );

        openRequest.onsuccess();
        const initValue = await service.initSubject.toPromise();

        expect(initValue).toBeFalse();
        expect(fakeDb.transaction).not.toHaveBeenCalled();
        expect(fakeDb.close).toHaveBeenCalled();
    });

    it('refreshes folder counts on indexUpdated', () => {
        const service = new SearchService(
            rmmapiStub as any,
            { request: jasmine.createSpy('request') } as any,
            { openFromComponent: jasmine.createSpy('openFromComponent') } as any,
            { open: jasmine.createSpy('open') } as any,
            messageListStub as any
        );

        openRequest.onsuccess();
        service.api = { reloadXapianDatabase: jasmine.createSpy('reloadXapianDatabase') } as any;

        service.indexUpdatedSubject.next(undefined);

        expect(messageListStub.refreshFolderCounts).toHaveBeenCalled();
        expect(messageListStub.refreshFolderList).toHaveBeenCalled();
    });
});

describe('SearchService downloadIndexFromServer', () => {
    let originalFS: any;

    beforeEach(() => {
        originalFS = (window as any).FS;
        (window as any).FS = {
            stat: jasmine.createSpy('stat').and.returnValue({}),
            mkdir: jasmine.createSpy('mkdir'),
            writeFile: jasmine.createSpy('writeFile')
        };
    });

    afterEach(() => {
        (window as any).FS = originalFS;
    });

    it('refreshes folder counts after initial download', (done) => {
        const service = Object.create(SearchService.prototype) as SearchService;
        const messageListStub = {
            refreshFolderList: jasmine.createSpy('refreshFolderList'),
            refreshFolderCounts: jasmine.createSpy('refreshFolderCounts')
        };
        const workerPostMessage = jasmine.createSpy('postMessage');

        service['indexWorker'] = { postMessage: workerPostMessage } as any;
        service['httpclient'] = {
            request: jasmine.createSpy('request').and.returnValue(
                of(new HttpResponse({ body: new ArrayBuffer(0) }))
            )
        } as any;
        service['init'] = jasmine.createSpy('init');
        (service as any)['initSubject'] = of(true);
        service['checkIfDownloadableIndexExists'] = jasmine.createSpy('checkIfDownloadableIndexExists')
            .and.returnValue(of(true));
        service['serverIndexSizeUncompressed'] = 1;
        service['api'] = {
            initXapianIndexReadOnly: jasmine.createSpy('initXapianIndexReadOnly'),
            getXapianDocCount: jasmine.createSpy('getXapianDocCount').and.returnValue(0),
            closeXapianDatabase: jasmine.createSpy('closeXapianDatabase')
        } as any;
        service['messagelistservice'] = messageListStub as any;
        service['updateIndexLastUpdateTime'] = jasmine.createSpy('updateIndexLastUpdateTime');
        service['stopIndexDownloadingInProgress'] = false;
        service['localSearchActivated'] = false;
        service['isIndexWriter'] = false;

        service.downloadIndexFromServer().subscribe(() => {
            expect(messageListStub.refreshFolderCounts).toHaveBeenCalled();
            expect(messageListStub.refreshFolderList).toHaveBeenCalled();
            expect(workerPostMessage).toHaveBeenCalledWith({ action: PostMessageAction.stopIndexUpdates });
            expect(workerPostMessage).not.toHaveBeenCalledWith({
                action: PostMessageAction.updateIndexWithNewChanges
            });
            done();
        });
    });
});
