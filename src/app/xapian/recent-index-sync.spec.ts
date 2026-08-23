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
import { runRecentIndexSync } from './recent-index-sync';

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

const messages = (firstId: number, count: number): MessageInfo[] =>
  Array.from({ length: count }, (_value, index) => message(firstId + index));

describe('runRecentIndexSync', () => {
  it('sorts a short page descending and commits it in visible batches', async () => {
    const committedIds: number[][] = [];
    const events = [];

    const result = await runRecentIndexSync({
      operationId: 'sync-1',
      baseline: 1234,
      pageSize: 1000,
      publishSize: 100,
      fetchPage: async () => messages(1, 250),
      commitBatch: async batch => {
        committedIds.push(batch.map(item => item.id));
      },
      isCancelled: () => false,
      onBatchCommitted: event => events.push(event)
    });

    expect(committedIds.map(batch => batch.length)).toEqual([100, 100, 50]);
    expect(committedIds[0][0]).toBe(250);
    expect(committedIds[2][49]).toBe(1);
    expect(events.map(event => event.cumulativeCommitted)).toEqual([100, 200, 250]);
    expect(result).toEqual(jasmine.objectContaining({
      fetchedMessages: 250,
      committedMessages: 250,
      cancelled: false
    }));
  });

  it('commits a full page before fetching the next page', async () => {
    const timeline: string[] = [];

    await runRecentIndexSync({
      operationId: 'sync-1',
      baseline: 1234,
      pageSize: 1000,
      publishSize: 100,
      fetchPage: async page => {
        timeline.push(`fetch-${page}`);
        return page === 0 ? messages(1, 1000) : [];
      },
      commitBatch: async (_batch, context) => {
        timeline.push(`commit-${context.page}-${context.batch}`);
      },
      isCancelled: () => false,
      onBatchCommitted: () => undefined
    });

    expect(timeline).toEqual([
      'fetch-0',
      'commit-0-0', 'commit-0-1', 'commit-0-2', 'commit-0-3', 'commit-0-4',
      'commit-0-5', 'commit-0-6', 'commit-0-7', 'commit-0-8', 'commit-0-9',
      'fetch-1'
    ]);
  });

  it('ends after a short page without fetching another page', async () => {
    const fetchedPages: number[] = [];

    await runRecentIndexSync({
      operationId: 'sync-1',
      baseline: 1234,
      pageSize: 1000,
      publishSize: 100,
      fetchPage: async page => {
        fetchedPages.push(page);
        return messages(1, 999);
      },
      commitBatch: async () => undefined,
      isCancelled: () => false,
      onBatchCommitted: () => undefined
    });

    expect(fetchedPages).toEqual([0]);
  });

  it('uses one fixed baseline and page size for every request', async () => {
    const requests: Array<[number, number, number]> = [];

    await runRecentIndexSync({
      operationId: 'sync-1',
      baseline: 1234,
      pageSize: 1000,
      publishSize: 100,
      fetchPage: async (page, baseline, pageSize) => {
        requests.push([page, baseline, pageSize]);
        return page === 0 ? messages(1, 1000) : [];
      },
      commitBatch: async () => undefined,
      isCancelled: () => false,
      onBatchCommitted: () => undefined
    });

    expect(requests).toEqual([[0, 1234, 1000], [1, 1234, 1000]]);
  });

  it('stops between publication batches when cancelled', async () => {
    let cancelled = false;
    const committedSizes: number[] = [];
    const events = [];

    const result = await runRecentIndexSync({
      operationId: 'sync-1',
      baseline: 1234,
      pageSize: 1000,
      publishSize: 100,
      fetchPage: async () => messages(1, 250),
      commitBatch: async batch => {
        committedSizes.push(batch.length);
        cancelled = true;
      },
      isCancelled: () => cancelled,
      onBatchCommitted: event => events.push(event)
    });

    expect(committedSizes).toEqual([100]);
    expect(events.length).toBe(1);
    expect(result.cancelled).toBeTrue();
    expect(result.committedMessages).toBe(100);
  });

  it('rejects a failed page instead of completing with empty data', async () => {
    const failure = new Error('network unavailable');

    await expectAsync(runRecentIndexSync({
      operationId: 'sync-1',
      baseline: 1234,
      pageSize: 1000,
      publishSize: 100,
      fetchPage: async () => Promise.reject(failure),
      commitBatch: async () => undefined,
      isCancelled: () => false,
      onBatchCommitted: () => undefined
    })).toBeRejectedWith(failure);
  });

  it('completes an empty catch-up without publishing a batch', async () => {
    const events = [];

    const result = await runRecentIndexSync({
      operationId: 'sync-1',
      baseline: 1234,
      pageSize: 1000,
      publishSize: 100,
      fetchPage: async () => [],
      commitBatch: async () => fail('empty catch-up must not commit a batch'),
      isCancelled: () => false,
      onBatchCommitted: event => events.push(event)
    });

    expect(events).toEqual([]);
    expect(result).toEqual(jasmine.objectContaining({
      fetchedMessages: 0,
      committedMessages: 0,
      cancelled: false
    }));
  });
});
