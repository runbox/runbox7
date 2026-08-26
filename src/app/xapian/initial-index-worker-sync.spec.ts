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

import { MessageInfo } from '../common/messageinfo';
import { CatchUpRecentCommand, InitialIndexSyncWorkerEvent } from './index-sync.types';
import { InitialIndexWorkerSync } from './initial-index-worker-sync';

const message = (id: number): MessageInfo => new MessageInfo(
  id,
  new Date(id * 1000),
  new Date(id * 1000),
  'Inbox',
  false,
  false,
  false,
  [],
  [],
  [],
  [],
  `Message ${id}`,
  '',
  100,
  false
);

const command = (finalizeWatermark = false): CatchUpRecentCommand => ({
  action: 'catchUpRecent',
  operationId: 'sync-1',
  baseline: 1234,
  pageSize: 1000,
  publishSize: 100,
  finalizeWatermark
});

describe('InitialIndexWorkerSync', () => {
  it('acknowledges a batch only after message changes are persisted', async () => {
    const timeline: string[] = [];
    const events: InitialIndexSyncWorkerEvent[] = [];
    const sync = new InitialIndexWorkerSync({
      fetchPage: async () => [message(2), message(1)],
      fetchDeletedMessages: async () => [9],
      commitBatch: async (messages, deletedIds) => {
        timeline.push(`commit-${messages.length}-${deletedIds.join(',')}`);
      },
      finalizeWatermark: async () => undefined,
      persist: async () => {
        timeline.push('persist');
      },
      postEvent: event => {
        timeline.push(event.action);
        events.push(event);
      }
    });
    sync.startOperation('sync-1');

    await sync.catchUp(command());

    expect(timeline).toEqual([
      'commit-2-9',
      'persist',
      'recentChunkCommitted',
      'recentCatchUpComplete'
    ]);
    expect(events[0]).toEqual(jasmine.objectContaining({
      action: 'recentChunkCommitted',
      operationId: 'sync-1',
      batchSize: 2
    }));
  });

  it('persists deletions before completing an otherwise empty catch-up', async () => {
    const timeline: string[] = [];
    const sync = new InitialIndexWorkerSync({
      fetchPage: async () => [],
      fetchDeletedMessages: async () => [7, 8],
      commitBatch: async (messages, deletedIds) => {
        timeline.push(`commit-${messages.length}-${deletedIds.join(',')}`);
      },
      finalizeWatermark: async () => undefined,
      persist: async () => {
        timeline.push('persist');
      },
      postEvent: event => timeline.push(event.action)
    });
    sync.startOperation('sync-1');

    await sync.catchUp(command());

    expect(timeline).toEqual([
      'commit-0-7,8',
      'persist',
      'recentCatchUpComplete'
    ]);
  });

  it('finalizes and persists the watermark only after the final pass', async () => {
    const timeline: string[] = [];
    const sync = new InitialIndexWorkerSync({
      fetchPage: async () => [message(2)],
      fetchDeletedMessages: async () => [],
      commitBatch: async () => {
        timeline.push('commit');
      },
      finalizeWatermark: async watermark => {
        timeline.push(`watermark-${watermark}`);
      },
      persist: async () => {
        timeline.push('persist');
      },
      postEvent: event => timeline.push(event.action)
    });
    sync.startOperation('sync-1');

    await sync.catchUp(command(true));

    expect(timeline).toEqual([
      'commit',
      'persist',
      'recentChunkCommitted',
      'watermark-2000',
      'persist',
      'recentCatchUpComplete'
    ]);
  });

  it('emits cancellation for the active operation between batches', async () => {
    const actions: string[] = [];
    const sync = new InitialIndexWorkerSync({
      fetchPage: async () => Array.from({ length: 250 }, (_value, index) =>
        message(index + 1)),
      fetchDeletedMessages: async () => [],
      commitBatch: async () => sync.cancel('sync-1'),
      finalizeWatermark: async () => undefined,
      persist: async () => undefined,
      postEvent: event => actions.push(event.action)
    });
    sync.startOperation('sync-1');

    await sync.catchUp(command());

    expect(actions).toEqual(['recentChunkCommitted', 'initialSyncCancelled']);
  });

  it('emits a safe failure event when a page cannot be fetched', async () => {
    const events: InitialIndexSyncWorkerEvent[] = [];
    const sync = new InitialIndexWorkerSync({
      fetchPage: async () => Promise.reject(new Error('private server response')),
      fetchDeletedMessages: async () => [],
      commitBatch: async () => undefined,
      finalizeWatermark: async () => undefined,
      persist: async () => undefined,
      postEvent: event => events.push(event)
    });
    sync.startOperation('sync-1');

    await sync.catchUp(command());

    expect(events).toEqual([{
      action: 'recentCatchUpFailed',
      operationId: 'sync-1',
      phase: 'catching-up-recent',
      code: 'recent-sync-failed',
      message: 'Unable to synchronize recent messages'
    }]);
  });

  it('does not publish a batch when persistence fails', async () => {
    const actions: string[] = [];
    const sync = new InitialIndexWorkerSync({
      fetchPage: async () => [message(1)],
      fetchDeletedMessages: async () => [],
      commitBatch: async () => undefined,
      finalizeWatermark: async () => undefined,
      persist: async () => Promise.reject(new Error('storage unavailable')),
      postEvent: event => actions.push(event.action)
    });
    sync.startOperation('sync-1');

    await sync.catchUp(command());

    expect(actions).toEqual(['recentCatchUpFailed']);
  });

  it('acknowledges exactly two durable batches before cancellation', async () => {
    const committed: number[] = [];
    const events: InitialIndexSyncWorkerEvent[] = [];
    const sync = new InitialIndexWorkerSync({
      fetchPage: async () => Array.from({ length: 250 }, (_value, index) =>
        message(index + 1)),
      fetchDeletedMessages: async () => [],
      commitBatch: async messages => {
        committed.push(messages.length);
        if (committed.length === 2) {
          sync.cancel('sync-1');
        }
      },
      finalizeWatermark: async () => undefined,
      persist: async () => undefined,
      postEvent: event => events.push(event)
    });
    sync.startOperation('sync-1');

    await sync.catchUp(command());

    expect(committed).toEqual([100, 100]);
    expect(events.filter(event => event.action === 'recentChunkCommitted').map(event =>
      event.action === 'recentChunkCommitted' ? event.cumulativeCommitted : 0
    )).toEqual([100, 200]);
    expect(events[events.length - 1].action).toBe('initialSyncCancelled');
  });
});
