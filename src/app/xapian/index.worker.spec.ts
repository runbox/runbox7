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

import { SearchIndexService } from './index.worker';
import { PostMessageAction } from './messageactions';

describe('SearchIndexService deleteLocalIndex', () => {
    let originalFS: any;
    let originalIDBFS: any;
    let originalPostMessage: any;
    let originalDeleteDatabase: any;
    let deleteRequests: any[];

    beforeEach(() => {
        originalFS = (window as any).FS;
        originalIDBFS = (window as any).IDBFS;
        originalPostMessage = (self as any).postMessage;
        originalDeleteDatabase = self.indexedDB.deleteDatabase.bind(self.indexedDB);

        (self as any).postMessage = jasmine.createSpy('postMessage');
        (window as any).FS = {
            analyzePath: jasmine.createSpy('analyzePath').and.returnValue({ exists: false }),
            unlink: jasmine.createSpy('unlink'),
            rmdir: jasmine.createSpy('rmdir'),
            readdir: jasmine.createSpy('readdir').and.returnValue([]),
            isDir: jasmine.createSpy('isDir'),
            stat: jasmine.createSpy('stat').and.throwError('not found')
        };
        (window as any).IDBFS = { dbs: {} };

        deleteRequests = [];
        spyOn(self.indexedDB, 'deleteDatabase').and.callFake(() => {
            const req: any = {};
            deleteRequests.push(req);
            return req;
        });
    });

    afterEach(() => {
        (window as any).FS = originalFS;
        (window as any).IDBFS = originalIDBFS;
        (self as any).postMessage = originalPostMessage;
        self.indexedDB.deleteDatabase = originalDeleteDatabase;
    });

    it('tolerates missing paths and still posts indexDeleted', (done) => {
        const service = new SearchIndexService();
        service.localSearchActivated = true;
        service.api = { closeXapianDatabase: jasmine.createSpy('closeXapianDatabase') } as any;
        service.localdir = 'rmmsearchservice1';
        service.partitionsdir = '/partitionsrmmsearchservice1';

        service.deleteLocalIndex().subscribe(() => {
            expect((self as any).postMessage).toHaveBeenCalledWith({
                action: PostMessageAction.indexDeleted
            });
            done();
        });

        expect(deleteRequests.length).toBe(1);
        deleteRequests[0].onsuccess();
        expect(deleteRequests.length).toBe(2);
        deleteRequests[1].onsuccess();
    });
});
