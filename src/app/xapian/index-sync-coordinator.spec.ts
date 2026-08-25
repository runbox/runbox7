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

import {
  IndexSyncCoordinator,
  IndexSyncCoordinatorDependencies
} from './index-sync-coordinator';
import {
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
  partitions: [partition(0), partition(1), partition(2)],
  totalCompressedBytes: 30,
  totalUncompressedBytes: 300,
  totalMessages: 300
};

const chunk = (committed: number): RecentChunkCommittedEvent => ({
  action: 'recentChunkCommitted',
  operationId: 'sync-1',
  page: 0,
  batch: committed / 100 - 1,
  batchSize: 100,
  fetchedMessages: 250,
  cumulativeCommitted: committed
});

const dependencies = (
  overrides: Partial<IndexSyncCoordinatorDependencies> = {}
): IndexSyncCoordinatorDependencies => ({
  discoverManifest: async () => manifest,
  downloadMainPartition: async () => undefined,
  openWorkerIndex: async () => 1234,
  catchUpRecent: async (_baseline, finalizeWatermark, onChunk) => {
    if (!finalizeWatermark) {
      await onChunk(chunk(100));
    }
    return {
      fetchedMessages: finalizeWatermark ? 0 : 250,
      committedMessages: finalizeWatermark ? 0 : 250,
      watermarkCandidate: 2000
    };
  },
  publishLocalIndex: async () => undefined,
  downloadHistoricalPartition: async () => undefined,
  startPeriodicSync: () => undefined,
  cancelWorkerSync: () => undefined,
  discardIncompleteIndex: async () => undefined,
  ...overrides
});

describe('IndexSyncCoordinator', () => {
  it('runs the approved phases and reconciles with the original baseline', async () => {
    const timeline: string[] = [];
    const baselines: number[] = [];
    const phases: string[] = [];
    const coordinator = new IndexSyncCoordinator('sync-1', dependencies({
      discoverManifest: async () => {
        timeline.push('manifest');
        return manifest;
      },
      downloadMainPartition: async () => {
        timeline.push('main');
      },
      openWorkerIndex: async () => {
        timeline.push('open');
        return 1234;
      },
      catchUpRecent: async (baseline, finalizeWatermark, onChunk) => {
        baselines.push(baseline);
        timeline.push(finalizeWatermark ? 'reconcile' : 'recent');
        if (!finalizeWatermark) {
          await onChunk(chunk(100));
          timeline.push('recent-complete');
        }
        return {
          fetchedMessages: finalizeWatermark ? 0 : 250,
          committedMessages: finalizeWatermark ? 0 : 250,
          watermarkCandidate: 2000
        };
      },
      publishLocalIndex: async () => {
        timeline.push('publish-local');
      },
      downloadHistoricalPartition: async indexPartition => {
        timeline.push(`history-${indexPartition.number}`);
      },
      startPeriodicSync: () => timeline.push('periodic')
    }));
    coordinator.state.subscribe(state => {
      if (phases[phases.length - 1] !== state.phase) {
        phases.push(state.phase);
      }
    });

    await coordinator.start();

    expect(timeline).toEqual([
      'manifest',
      'main',
      'open',
      'recent',
      'publish-local',
      'recent-complete',
      'history-1',
      'history-2',
      'reconcile',
      'periodic'
    ]);
    expect(baselines).toEqual([1234, 1234]);
    expect(phases).toEqual([
      'discovering',
      'downloading-main',
      'opening-worker',
      'catching-up-recent',
      'local-index-ready',
      'downloading-history',
      'final-reconciliation',
      'complete'
    ]);
  });

  it('publishes an empty recent catch-up before downloading history', async () => {
    const timeline: string[] = [];
    const coordinator = new IndexSyncCoordinator('sync-1', dependencies({
      catchUpRecent: async (_baseline, finalizeWatermark) => ({
        fetchedMessages: 0,
        committedMessages: 0,
        watermarkCandidate: finalizeWatermark ? 1234 : 1234
      }),
      publishLocalIndex: async () => {
        timeline.push('publish-local');
      },
      downloadHistoricalPartition: async indexPartition => {
        timeline.push(`history-${indexPartition.number}`);
      }
    }));

    await coordinator.start();

    expect(timeline).toEqual(['publish-local', 'history-1', 'history-2']);
  });

  it('discards an incomplete index when synchronization fails before cutover', async () => {
    const discarded: string[] = [];
    const coordinator = new IndexSyncCoordinator('sync-1', dependencies({
      downloadMainPartition: async () => Promise.reject(new Error('download failed')),
      discardIncompleteIndex: async () => {
        discarded.push('discarded');
      }
    }));

    await coordinator.start();

    expect(discarded).toEqual(['discarded']);
    expect(coordinator.state.value).toEqual(jasmine.objectContaining({
      phase: 'failed',
      error: 'Unable to synchronize the local search index'
    }));
  });

  it('retains a usable local index when historical download fails', async () => {
    const discarded: string[] = [];
    const coordinator = new IndexSyncCoordinator('sync-1', dependencies({
      downloadHistoricalPartition: async () => Promise.reject(new Error('history failed')),
      discardIncompleteIndex: async () => {
        discarded.push('discarded');
      }
    }));

    await coordinator.start();

    expect(discarded).toEqual([]);
    expect(coordinator.state.value.phase).toBe('failed');
  });

  it('cancels the worker and discards data when cancelled before cutover', async () => {
    const timeline: string[] = [];
    const coordinator = new IndexSyncCoordinator('sync-1', dependencies({
      downloadMainPartition: async () => coordinator.cancel(),
      cancelWorkerSync: () => timeline.push('cancel-worker'),
      discardIncompleteIndex: async () => {
        timeline.push('discard');
      }
    }));

    await coordinator.start();

    expect(timeline).toEqual(['cancel-worker', 'discard']);
    expect(coordinator.state.value.phase).toBe('cancelled');
  });
});
