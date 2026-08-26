// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2026 Runbox Solutions AS (runbox.com).
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

import { EMPTY } from 'rxjs';

import { AppComponent } from './app.component';
import { IndexSyncPhase, IndexSyncState } from './xapian/index-sync.types';
import { SearchService } from './xapian/searchservice';

const state = (
  phase: IndexSyncPhase,
  changes: Partial<IndexSyncState> = {}
): IndexSyncState => ({
  operationId: 'sync-1',
  phase,
  fetchedMessages: 0,
  committedMessages: 0,
  currentPage: 0,
  currentPartition: 0,
  totalPartitions: 3,
  downloadedBytes: 0,
  totalBytes: 300,
  error: null,
  ...changes
});

const componentWithoutConstructor = (): AppComponent =>
  Object.create(AppComponent.prototype) as AppComponent;

describe('AppComponent initial index synchronization', () => {
  it('starts only the coordinated initial synchronization', () => {
    const component = componentWithoutConstructor();
    const searchService = jasmine.createSpyObj<SearchService>(
      'SearchService',
      ['startInitialIndexSynchronization', 'downloadIndexFromServer', 'downloadPartitions']
    );
    searchService.startInitialIndexSynchronization.and.returnValue(EMPTY);
    component.searchService = searchService;
    Object.assign(component, {
      storage: { set: jasmine.createSpy('set') }
    });
    spyOn(component, 'enableNotification');

    component.downloadIndexFromServer();

    expect(searchService.startInitialIndexSynchronization).toHaveBeenCalledTimes(1);
    expect(searchService.downloadIndexFromServer).not.toHaveBeenCalled();
    expect(searchService.downloadPartitions).not.toHaveBeenCalled();
  });

  it('cancels the coordinated synchronization while it is active', () => {
    const component = componentWithoutConstructor();
    const searchService = jasmine.createSpyObj<SearchService>(
      'SearchService',
      ['cancelInitialIndexSynchronization']
    );
    component.searchService = searchService;
    component.indexSyncState = state('catching-up-recent');
    Object.assign(component, {
      storage: { set: jasmine.createSpy('set') }
    });
    spyOn(component, 'enableNotification');

    component.cancelOrRefuseLocalIndex();

    expect(searchService.cancelInitialIndexSynchronization).toHaveBeenCalledTimes(1);
  });

  it('keeps the database list until the first local batch is ready', () => {
    const component = componentWithoutConstructor();
    component.usewebsocketsearch = true;
    spyOn(component, 'afterUpdateIndex');
    spyOn(component, 'updateSearch');

    component.handleInitialIndexSyncState(state('catching-up-recent', {
      committedMessages: 100
    }));

    expect(component.usewebsocketsearch).toBeTrue();
    expect(component.afterUpdateIndex).not.toHaveBeenCalled();
    expect(component.updateSearch).not.toHaveBeenCalled();
  });

  it('cuts over once and redraws later batches without scrolling', () => {
    const component = componentWithoutConstructor();
    component.usewebsocketsearch = true;
    spyOn(component, 'afterUpdateIndex').and.callFake(() => {
      component.usewebsocketsearch = false;
    });
    spyOn(component, 'updateSearch');

    component.handleInitialIndexSyncState(state('local-index-ready', {
      committedMessages: 100
    }));
    component.handleInitialIndexSyncState(state('local-index-ready', {
      committedMessages: 100
    }));
    component.handleInitialIndexSyncState(state('final-reconciliation', {
      committedMessages: 200
    }));

    expect(component.afterUpdateIndex).toHaveBeenCalledTimes(1);
    expect(component.updateSearch).toHaveBeenCalledOnceWith(true, true);
  });

  it('keeps the database display when synchronization fails before cutover', () => {
    const component = componentWithoutConstructor();
    component.usewebsocketsearch = true;
    spyOn(component, 'afterUpdateIndex');

    component.handleInitialIndexSyncState(state('failed', {
      error: 'Unable to synchronize the local search index'
    }));

    expect(component.usewebsocketsearch).toBeTrue();
    expect(component.afterUpdateIndex).not.toHaveBeenCalled();
    expect(component.indexSyncError).toContain('Unable to synchronize');
  });

  it('keeps the local display when optional history fails after cutover', () => {
    const component = componentWithoutConstructor();
    component.usewebsocketsearch = true;
    spyOn(component, 'afterUpdateIndex').and.callFake(() => {
      component.usewebsocketsearch = false;
    });

    component.handleInitialIndexSyncState(state('local-index-ready'));
    component.handleInitialIndexSyncState(state('failed', {
      error: 'Unable to synchronize the local search index'
    }));

    expect(component.usewebsocketsearch).toBeFalse();
    expect(component.afterUpdateIndex).toHaveBeenCalledTimes(1);
  });
});
