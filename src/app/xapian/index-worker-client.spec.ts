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

import { IndexWorkerClient } from './index-worker-client';

describe('IndexWorkerClient', () => {
  let postedMessages: unknown[];
  let worker: Worker;
  let client: IndexWorkerClient;

  beforeEach(() => {
    postedMessages = [];
    worker = {
      postMessage: (message: unknown) => postedMessages.push(message)
    } as unknown as Worker;
    client = new IndexWorkerClient(worker);
    client.startOperation('sync-1');
  });

  it('sends typed open and recent catch-up commands', () => {
    client.openIndex('/local', '/partitions');
    client.catchUpRecent(1234, false);

    expect(postedMessages).toEqual([{
      action: 'openIndex',
      operationId: 'sync-1',
      localdir: '/local',
      partitionsdir: '/partitions'
    }, {
      action: 'catchUpRecent',
      operationId: 'sync-1',
      baseline: 1234,
      pageSize: 1000,
      publishSize: 100,
      finalizeWatermark: false
    }]);
  });

  it('publishes matching events and ignores stale operation events', () => {
    const receivedActions: string[] = [];
    client.events.subscribe(event => receivedActions.push(event.action));

    expect(client.handleMessage({
      action: 'workerIndexReady',
      operationId: 'sync-old',
      baseline: 1000
    })).toBeTrue();
    expect(client.handleMessage({
      action: 'workerIndexReady',
      operationId: 'sync-1',
      baseline: 1234
    })).toBeTrue();

    expect(receivedActions).toEqual(['workerIndexReady']);
  });

  it('does not consume a legacy worker event', () => {
    expect(client.handleMessage({ action: 'indexUpdated' })).toBeFalse();
  });

  it('sends cancellation and periodic synchronization commands', () => {
    client.cancelInitialSync();
    client.startPeriodicSync();

    expect(postedMessages).toEqual([{
      action: 'cancelInitialSync',
      operationId: 'sync-1'
    }, {
      action: 'startPeriodicSync',
      operationId: 'sync-1'
    }]);
  });
});
