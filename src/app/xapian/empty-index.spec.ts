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

import { firstValueFrom, of } from 'rxjs';
import { SearchService, XAPIAN_GLASS_WR } from './searchservice';
import { XapianAPI } from '@runboxcom/runbox-searchindex';
import { xapianLoadedSubject } from './xapianwebloader';

declare const FS;

describe('SearchService without a server index', () => {
  let service: SearchService;
  let directory: string;
  let databaseOpen: boolean;

  beforeAll(async () => {
    await firstValueFrom(xapianLoadedSubject);
  });

  beforeEach(() => {
    directory = '/empty-index-' + Math.random().toString(36).slice(2);
    FS.mkdir(directory);
    FS.chdir(directory);
    databaseOpen = false;
    // Exercise the real database without starting unrelated constructor subscriptions.
    service = Object.create(SearchService.prototype);
    Object.assign(service, {
      api: new XapianAPI(),
      initSubject: of(false),
      localSearchActivated: false,
      stopIndexDownloadingInProgress: false,
      indexWorker: { postMessage: jasmine.createSpy('postMessage') },
      messagelistservice: { refreshFolderList: jasmine.createSpy('refreshFolderList') }
    });
    spyOn(service, 'init').and.stub();
    spyOn(service, 'checkIfDownloadableIndexExists').and.returnValue(of(false));
  });

  afterEach(() => {
    if (databaseOpen) {
      service.api.closeXapianDatabase();
    }
    FS.chdir('/');
    if (FS.analyzePath(directory + '/' + XAPIAN_GLASS_WR).exists) {
      FS.readdir(directory + '/' + XAPIAN_GLASS_WR)
        .filter(name => name !== '.' && name !== '..')
        .forEach(name => FS.unlink(directory + '/' + XAPIAN_GLASS_WR + '/' + name));
      FS.rmdir(directory + '/' + XAPIAN_GLASS_WR);
    }
    FS.rmdir(directory);
  });

  it('creates a readable empty index that accepts the first message on worker reopen', async () => {
    const available = await firstValueFrom(service.downloadIndexFromServer());
    expect(available).toBeTrue();
    if (!available) {
      return;
    }
    databaseOpen = true;
    expect(service.localSearchActivated).toBeTrue();
    expect(service.indexLastUpdateTime).toBe(0);
    expect(service.stopIndexDownloadingInProgress).toBeFalse();
    expect(service.api.getXapianDocCount()).toBe(0);
    // Empty Xapian databases have no document-data file until their first document commit.
    expect(FS.analyzePath(XAPIAN_GLASS_WR + '/docdata.glass').exists).toBeFalse();
    service.api.closeXapianDatabase();
    service.api.initXapianIndex(XAPIAN_GLASS_WR);
    service.api.addSortableEmailToXapianIndex('Q1', 'Sender', 'SENDER', 'sender@example.com',
      ['recipient@example.com'], 'Welcome', 'WELCOME', '20260908090000', 100,
      'Synthetic welcome message', 'Inbox', false, false, false, false);
    service.api.commitXapianUpdates();
    service.api.closeXapianDatabase();
    service.api.initXapianIndexReadOnly(XAPIAN_GLASS_WR);
    expect(service.api.getXapianDocCount()).toBe(1);
    expect(service.api.getDocumentData(1)).toContain('Q1');
    expect(service.api.getDocumentData(1)).toContain('Welcome');
  });

  it('does not create an index after cancellation', async () => {
    service.stopIndexDownloadingInProgress = true;
    expect(await firstValueFrom(service.downloadIndexFromServer())).toBeFalse();
    expect(service.localSearchActivated).toBeFalse();
    expect(FS.analyzePath(XAPIAN_GLASS_WR).exists).toBeFalse();
  });
});
