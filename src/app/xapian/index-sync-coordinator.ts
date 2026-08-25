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

import { BehaviorSubject } from 'rxjs';

import {
  IndexSyncState,
  NormalizedIndexManifest,
  NormalizedIndexPartition,
  RecentChunkCommittedEvent
} from './index-sync.types';

export interface IndexSyncCatchUpResult {
  fetchedMessages: number;
  committedMessages: number;
  watermarkCandidate: number;
}

export interface IndexSyncCoordinatorDependencies {
  discoverManifest: () => Promise<NormalizedIndexManifest>;
  downloadMainPartition: (
    manifest: NormalizedIndexManifest,
    onProgress: (downloadedBytes: number) => void
  ) => Promise<void>;
  openWorkerIndex: () => Promise<number>;
  catchUpRecent: (
    baseline: number,
    finalizeWatermark: boolean,
    onChunk: (event: RecentChunkCommittedEvent) => Promise<void>
  ) => Promise<IndexSyncCatchUpResult>;
  publishLocalIndex: () => Promise<void>;
  downloadHistoricalPartition: (
    partition: NormalizedIndexPartition,
    onProgress: (downloadedBytes: number) => void
  ) => Promise<void>;
  startPeriodicSync: () => void;
  cancelWorkerSync: () => void;
  discardIncompleteIndex: () => Promise<void>;
}

const initialState = (operationId: string): IndexSyncState => ({
  operationId,
  phase: 'discovering',
  fetchedMessages: 0,
  committedMessages: 0,
  currentPage: 0,
  currentPartition: 0,
  totalPartitions: 0,
  downloadedBytes: 0,
  totalBytes: 0,
  error: null
});

export class IndexSyncCoordinator {
  public readonly state: BehaviorSubject<IndexSyncState>;

  private cancelled = false;
  private localIndexPublished = false;
  private cutoverPromise: Promise<void> = null;

  constructor(
    private operationId: string,
    private dependencies: IndexSyncCoordinatorDependencies
  ) {
    this.state = new BehaviorSubject(initialState(operationId));
  }

  public async start(): Promise<void> {
    try {
      const manifest = await this.dependencies.discoverManifest();
      this.updateState({
        totalPartitions: manifest.partitions.length,
        totalBytes: manifest.totalCompressedBytes
      });
      if (await this.finishCancellation()) {
        return;
      }

      this.updateState({ phase: 'downloading-main' });
      await this.dependencies.downloadMainPartition(
        manifest,
        downloadedBytes => this.updateState({ downloadedBytes })
      );
      if (await this.finishCancellation()) {
        return;
      }

      this.updateState({ phase: 'opening-worker' });
      const baseline = await this.dependencies.openWorkerIndex();
      if (await this.finishCancellation()) {
        return;
      }

      this.updateState({ phase: 'catching-up-recent' });
      const recentResult = await this.dependencies.catchUpRecent(
        baseline,
        false,
        event => this.onRecentChunk(event)
      );
      if (await this.finishCancellation()) {
        return;
      }

      this.updateState({
        fetchedMessages: recentResult.fetchedMessages,
        committedMessages: recentResult.committedMessages
      });
      await this.publishLocalIndex();

      const historicalPartitions = manifest.partitions
        .filter(partition => partition.number > 0)
        .sort((left, right) => left.number - right.number);
      for (const partition of historicalPartitions) {
        this.updateState({
          phase: 'downloading-history',
          currentPartition: partition.number
        });
        await this.dependencies.downloadHistoricalPartition(
          partition,
          downloadedBytes => this.updateState({ downloadedBytes })
        );
        if (await this.finishCancellation()) {
          return;
        }
      }

      this.updateState({ phase: 'final-reconciliation' });
      const finalResult = await this.dependencies.catchUpRecent(
        baseline,
        true,
        event => this.onRecentChunk(event)
      );
      if (await this.finishCancellation()) {
        return;
      }
      this.updateState({
        fetchedMessages: this.state.value.fetchedMessages + finalResult.fetchedMessages,
        committedMessages: this.state.value.committedMessages + finalResult.committedMessages
      });

      this.dependencies.startPeriodicSync();
      this.updateState({ phase: 'complete' });
    } catch (_error) {
      if (this.cancelled) {
        await this.finishCancellation();
        return;
      }
      if (!this.localIndexPublished) {
        await this.dependencies.discardIncompleteIndex();
      }
      this.updateState({
        phase: 'failed',
        error: 'Unable to synchronize the local search index'
      });
    }
  }

  public cancel(): void {
    if (this.cancelled) {
      return;
    }
    this.cancelled = true;
    this.dependencies.cancelWorkerSync();
  }

  private async onRecentChunk(event: RecentChunkCommittedEvent): Promise<void> {
    this.updateState({
      fetchedMessages: event.fetchedMessages,
      committedMessages: event.cumulativeCommitted,
      currentPage: event.page
    });
    await this.publishLocalIndex();
  }

  private async publishLocalIndex(): Promise<void> {
    if (!this.cutoverPromise) {
      this.cutoverPromise = this.dependencies.publishLocalIndex().then(() => {
        this.localIndexPublished = true;
        this.updateState({ phase: 'local-index-ready' });
      });
    }
    await this.cutoverPromise;
  }

  private async finishCancellation(): Promise<boolean> {
    if (!this.cancelled) {
      return false;
    }
    await this.dependencies.discardIncompleteIndex();
    this.updateState({ phase: 'cancelled' });
    return true;
  }

  private updateState(changes: Partial<IndexSyncState>): void {
    this.state.next({ ...this.state.value, ...changes });
  }
}
