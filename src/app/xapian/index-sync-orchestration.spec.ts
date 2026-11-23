// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2026 Runbox Solutions AS (runbox.com).
//
// This file is part of Runbox 7.
//
// Runbox 7 is free software: you can redistribute it and/or modify it
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

import {
  IndexSyncCoordinator,
  IndexSyncCoordinatorDependencies
} from './index-sync-coordinator';
import { promoteHistoricalPartition } from './historical-partition-promotion';
import {
  IndexSyncError,
  NormalizedIndexManifest,
  NormalizedIndexPartition,
  RecentChunkCommittedEvent
} from './index-sync.types';

const partition = (number: number): NormalizedIndexPartition => ({
  number,
  folder: number === 0 ? 'downloadable' : `xapianglass_${number}`,
  numberOfMessages: 100,
  files: [{ filename: 'iamglass', compressedsize: 10, uncompressedsize: 100 }]
});

const manifest: NormalizedIndexManifest = {
  partitions: [partition(0), partition(1)],
  totalCompressedBytes: 20,
  totalUncompressedBytes: 200,
  totalMessages: 200
};

const chunk: RecentChunkCommittedEvent = {
  action: 'recentChunkCommitted',
  operationId: 'sync-1',
  page: 0,
  batch: 0,
  batchSize: 100,
  fetchedMessages: 150,
  cumulativeCommitted: 100
};

const dependencies = (
  overrides: Partial<IndexSyncCoordinatorDependencies> = {}
): IndexSyncCoordinatorDependencies => ({
  discoverManifest: async () => manifest,
  downloadMainPartition: async () => undefined,
  openWorkerIndex: async () => 1234,
  catchUpRecent: async (_baseline, finalizeWatermark, onChunk) => {
    if (!finalizeWatermark) {
      await onChunk(chunk);
    }
    return {
      fetchedMessages: finalizeWatermark ? 0 : 150,
      committedMessages: finalizeWatermark ? 0 : 150,
      watermarkCandidate: 2000
    };
  },
  publishLocalIndex: async () => undefined,
  reloadPublishedLocalIndex: async () => undefined,
  downloadHistoricalPartition: async () => undefined,
  shouldDownloadHistoricalPartition: async () => true,
  startPeriodicSync: () => undefined,
  cancelWorkerSync: () => undefined,
  discardIncompleteIndex: async () => undefined,
  waitBeforeRetry: async () => undefined,
  ...overrides
});

describe('incremental index synchronization orchestration', () => {
  it('publishes a durable recent batch before history and final reconciliation', async () => {
    const timeline: string[] = [];
    const coordinator = new IndexSyncCoordinator('sync-1', dependencies({
      discoverManifest: async () => {
        timeline.push('manifest');
        return manifest;
      },
      downloadMainPartition: async () => {
        timeline.push('main');
      },
      openWorkerIndex: async () => {
        timeline.push('worker-ready');
        return 1234;
      },
      catchUpRecent: async (_baseline, finalizeWatermark, onChunk) => {
        timeline.push(finalizeWatermark ? 'reconcile' : 'recent');
        if (!finalizeWatermark) {
          await onChunk(chunk);
          timeline.push('remaining-recent');
        }
        return {
          fetchedMessages: finalizeWatermark ? 0 : 150,
          committedMessages: finalizeWatermark ? 0 : 150,
          watermarkCandidate: 2000
        };
      },
      publishLocalIndex: async () => {
        timeline.push('cutover');
      },
      downloadHistoricalPartition: async () => {
        timeline.push('history');
      },
      startPeriodicSync: () => timeline.push('periodic')
    }));

    await coordinator.start();

    expect(timeline).toEqual([
      'manifest',
      'main',
      'worker-ready',
      'recent',
      'cutover',
      'remaining-recent',
      'history',
      'reconcile',
      'periodic'
    ]);
    expect(coordinator.state.value.phase).toBe('complete');
  });

  it('does not retry after cancellation wins during backoff', async () => {
    let attempts = 0;
    const coordinator = new IndexSyncCoordinator('sync-1', dependencies({
      catchUpRecent: async () => {
        attempts++;
        throw new IndexSyncError({
          operationId: 'sync-1',
          phase: 'catching-up-recent',
          page: null,
          partition: null,
          attempt: attempts,
          category: 'transport',
          recoverable: true,
          message: 'Transport failed'
        });
      },
      waitBeforeRetry: async () => coordinator.cancel()
    }));

    await coordinator.start();

    expect(attempts).toBe(1);
    expect(coordinator.state.value.phase).toBe('cancelled');
  });

  it('reports failed when cancellation cleanup cannot roll back storage', async () => {
    const coordinator = new IndexSyncCoordinator('sync-1', dependencies({
      downloadMainPartition: async () => coordinator.cancel(),
      discardIncompleteIndex: async () => {
        throw new Error('rollback failed');
      }
    }));

    await coordinator.start();

    expect(coordinator.state.value.phase).toBe('failed');
  });

  it('restores an existing historical partition when replacement opening fails', async () => {
    const timeline: string[] = [];
    const promotion = {
      backupExisting: async () => {
        timeline.push('backup-existing');
      },
      removeExisting: async () => {
        timeline.push('backup-existing');
      },
      promote: () => timeline.push('promote'),
      persist: async () => {
        timeline.push('persist');
      },
      reopenWorker: async () => {
        timeline.push('worker');
      },
      openMainView: () => {
        timeline.push('main');
        throw new Error('invalid replacement');
      },
      open: () => {
        timeline.push('main');
        throw new Error('invalid replacement');
      },
      removeBackup: async () => {
        timeline.push('remove-backup');
      },
      removePromoted: async () => {
        timeline.push('remove-replacement');
      },
      restoreBackup: async () => {
        timeline.push('restore-existing');
      }
    };

    await expectAsync(promoteHistoricalPartition(promotion))
      .toBeRejectedWithError(/invalid replacement/);

    expect(timeline).toContain('remove-replacement');
    expect(timeline).toContain('restore-existing');
    expect(timeline).not.toContain('remove-backup');
  });
});
