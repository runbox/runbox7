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
  IndexSyncError,
  IndexSyncFailureCategory,
  IndexSyncFailureDetails,
  IndexSyncPhase,
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
  reloadPublishedLocalIndex: () => Promise<void>;
  downloadHistoricalPartition: (
    partition: NormalizedIndexPartition,
    onProgress: (downloadedBytes: number) => void
  ) => Promise<void>;
  shouldDownloadHistoricalPartition: (
    partition: NormalizedIndexPartition,
    index: number
  ) => Promise<boolean>;
  startPeriodicSync: () => void;
  cancelWorkerSync: () => void;
  discardIncompleteIndex: () => Promise<void>;
  waitBeforeRetry: (delayMilliseconds: number) => Promise<void>;
}

const retryDelays = [1000, 2000, 4000];

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
    operationId: string,
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
      const recentResult = await this.catchUpRecentWithRetry(
        baseline,
        false,
        event => this.onRecentChunk(event, 0, 0)
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
      for (const [index, partition] of historicalPartitions.entries()) {
        if (!await this.dependencies.shouldDownloadHistoricalPartition(partition, index)) {
          break;
        }
        this.updateState({
          phase: 'downloading-history',
          currentPartition: partition.number
        });
        await this.withBoundedRetry(() =>
          this.dependencies.downloadHistoricalPartition(
            partition,
            downloadedBytes => this.updateState({ downloadedBytes })
          )
        );
        if (await this.finishCancellation()) {
          return;
        }
      }

      this.updateState({ phase: 'final-reconciliation' });
      const fetchedBeforeReconciliation = this.state.value.fetchedMessages;
      const committedBeforeReconciliation = this.state.value.committedMessages;
      const finalResult = await this.catchUpRecentWithRetry(
        baseline,
        true,
        event => this.onRecentChunk(
          event,
          fetchedBeforeReconciliation,
          committedBeforeReconciliation
        )
      );
      if (await this.finishCancellation()) {
        return;
      }
      this.updateState({
        fetchedMessages: fetchedBeforeReconciliation + finalResult.fetchedMessages,
        committedMessages: committedBeforeReconciliation + finalResult.committedMessages
      });

      this.dependencies.startPeriodicSync();
      this.updateState({ phase: 'complete' });
    } catch (error) {
      if (this.cancelled) {
        await this.finishCancellation();
        return;
      }
      console.error(
        `Initial index synchronization failed during ${this.state.value.phase}`,
        error instanceof IndexSyncError ? error.cause || error : error
      );
      if (!this.localIndexPublished) {
        await this.discardIncompleteIndex();
      }
      this.updateState({
        phase: 'failed',
        error: this.failureDetails(error)
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

  private async onRecentChunk(
    event: RecentChunkCommittedEvent,
    fetchedOffset: number,
    committedOffset: number
  ): Promise<void> {
    if (this.cancelled) {
      return;
    }
    try {
      if (this.localIndexPublished) {
        await this.dependencies.reloadPublishedLocalIndex();
      }
    } catch (error) {
      throw this.syncError(
        'publication',
        false,
        'Unable to publish the local search index',
        error
      );
    }
    if (this.cancelled) {
      return;
    }
    this.updateState({
      fetchedMessages: fetchedOffset + event.fetchedMessages,
      committedMessages: committedOffset + event.cumulativeCommitted,
      currentPage: event.page
    });
    if (!this.localIndexPublished) {
      try {
        await this.publishLocalIndex();
      } catch (error) {
        throw this.syncError(
          'publication',
          false,
          'Unable to publish the local search index',
          error
        );
      }
    }
  }

  private catchUpRecentWithRetry(
    baseline: number,
    finalizeWatermark: boolean,
    onChunk: (event: RecentChunkCommittedEvent) => Promise<void>
  ): Promise<IndexSyncCatchUpResult> {
    return this.withBoundedRetry(() => this.dependencies.catchUpRecent(
      baseline,
      finalizeWatermark,
      onChunk
    ));
  }

  private async withBoundedRetry<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const syncError = this.normalizeRetryError(error, attempt + 1);
        if (this.cancelled || syncError.details.category !== 'transport' ||
          !syncError.details.recoverable || attempt >= retryDelays.length) {
          throw syncError;
        }
        await this.dependencies.waitBeforeRetry(retryDelays[attempt]);
      }
    }
  }

  private async publishLocalIndex(): Promise<void> {
    if (!this.cutoverPromise) {
      this.cutoverPromise = this.dependencies.publishLocalIndex().then(() => {
        if (this.cancelled) {
          return;
        }
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
    await this.discardIncompleteIndex();
    this.updateState({ phase: 'cancelled' });
    return true;
  }

  private async discardIncompleteIndex(): Promise<void> {
    try {
      await this.dependencies.discardIncompleteIndex();
    } catch (error) {
      console.error('Unable to discard the incomplete local search index', error);
    }
  }

  private updateState(changes: Partial<IndexSyncState>): void {
    const current = this.state.value;
    this.state.next({
      ...current,
      ...changes,
      downloadedBytes: changes.downloadedBytes === undefined
        ? current.downloadedBytes
        : Math.max(current.downloadedBytes, changes.downloadedBytes),
      fetchedMessages: changes.fetchedMessages === undefined
        ? current.fetchedMessages
        : Math.max(current.fetchedMessages, changes.fetchedMessages),
      committedMessages: changes.committedMessages === undefined
        ? current.committedMessages
        : Math.max(current.committedMessages, changes.committedMessages)
    });
  }

  private normalizeRetryError(error: unknown, attempt: number): IndexSyncError {
    if (error instanceof IndexSyncError) {
      return new IndexSyncError({
        ...error.details,
        operationId: this.state.value.operationId,
        phase: this.state.value.phase,
        attempt
      }, error.cause);
    }
    return this.syncError(
      this.defaultFailureCategory(this.state.value.phase),
      false,
      'Unable to synchronize the local search index',
      error,
      attempt
    );
  }

  private failureDetails(error: unknown): IndexSyncFailureDetails {
    if (error instanceof IndexSyncError) {
      return {
        ...error.details,
        operationId: this.state.value.operationId,
        phase: error.details.phase || this.state.value.phase,
        message: 'Unable to synchronize the local search index'
      };
    }
    return this.syncError(
      this.defaultFailureCategory(this.state.value.phase),
      false,
      'Unable to synchronize the local search index',
      error
    ).details;
  }

  private syncError(
    category: IndexSyncFailureCategory,
    recoverable: boolean,
    message: string,
    cause: unknown,
    attempt = 1
  ): IndexSyncError {
    return new IndexSyncError({
      operationId: this.state.value.operationId,
      phase: this.state.value.phase,
      page: this.state.value.currentPage || null,
      partition: this.state.value.currentPartition || null,
      attempt,
      category,
      recoverable,
      message
    }, cause);
  }

  private defaultFailureCategory(phase: IndexSyncPhase): IndexSyncFailureCategory {
    if (phase === 'discovering') {
      return 'validation';
    }
    if (phase === 'opening-worker') {
      return 'initialization';
    }
    return 'corruption';
  }
}
