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

import { handleInitialSyncWorkerCommand } from './index-worker-command-handler';

describe('handleInitialSyncWorkerCommand', () => {
  it('dispatches each initial synchronization command', () => {
    const received: string[] = [];
    const handlers = {
      prepareIndexReplacement: () => received.push('prepareIndexReplacement'),
      openIndex: () => received.push('openIndex'),
      catchUpRecent: () => received.push('catchUpRecent'),
      cancelInitialSync: () => received.push('cancelInitialSync'),
      startPeriodicSync: () => received.push('startPeriodicSync')
    };

    expect(handleInitialSyncWorkerCommand({
      action: 'prepareIndexReplacement', operationId: 'sync-1'
    }, handlers)).toBeTrue();
    expect(handleInitialSyncWorkerCommand({
      action: 'openIndex', operationId: 'sync-1', localdir: '/local', partitionsdir: '/parts'
    }, handlers)).toBeTrue();
    expect(handleInitialSyncWorkerCommand({
      action: 'catchUpRecent', operationId: 'sync-1', baseline: 1,
      pageSize: 1000, publishSize: 100, finalizeWatermark: false
    }, handlers)).toBeTrue();
    expect(handleInitialSyncWorkerCommand({
      action: 'cancelInitialSync', operationId: 'sync-1'
    }, handlers)).toBeTrue();
    expect(handleInitialSyncWorkerCommand({
      action: 'startPeriodicSync', operationId: 'sync-1'
    }, handlers)).toBeTrue();

    expect(received).toEqual([
      'prepareIndexReplacement', 'openIndex', 'catchUpRecent',
      'cancelInitialSync', 'startPeriodicSync'
    ]);
  });

  it('leaves legacy worker actions for the existing dispatcher', () => {
    const handlers = {
      prepareIndexReplacement: () => fail('legacy action must not prepare replacement'),
      openIndex: () => fail('legacy action must not open an index'),
      catchUpRecent: () => fail('legacy action must not start catch-up'),
      cancelInitialSync: () => fail('legacy action must not cancel catch-up'),
      startPeriodicSync: () => fail('legacy action must not start periodic sync')
    };

    expect(handleInitialSyncWorkerCommand({ action: 'indexUpdated' }, handlers)).toBeFalse();
  });
});
