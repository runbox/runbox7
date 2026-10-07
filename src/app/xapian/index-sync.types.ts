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

export const INITIAL_SYNC_PAGE_SIZE = 1000;
export const VISIBLE_INDEX_BATCH_SIZE = 100;

export type IndexSyncPhase =
  | 'discovering'
  | 'downloading-main'
  | 'opening-worker'
  | 'catching-up-recent'
  | 'local-index-ready'
  | 'downloading-history'
  | 'final-reconciliation'
  | 'complete'
  | 'failed'
  | 'cancelled';

export type IndexSyncFailureCategory =
  | 'transport'
  | 'initialization'
  | 'persistence'
  | 'validation'
  | 'publication'
  | 'corruption'
  | 'rollback'
  | 'cancellation-cleanup';

export interface IndexSyncFailureDetails {
  operationId: string;
  phase: IndexSyncPhase;
  page: number | null;
  partition: number | null;
  attempt: number;
  category: IndexSyncFailureCategory;
  recoverable: boolean;
  message: string;
}

export class IndexSyncError extends Error {
  constructor(
    public readonly details: IndexSyncFailureDetails,
    public readonly cause: unknown = null
  ) {
    super(details.message);
    this.name = 'IndexSyncError';
  }
}

export interface IndexSyncState {
  operationId: string;
  phase: IndexSyncPhase;
  fetchedMessages: number;
  committedMessages: number;
  currentPage: number;
  currentPartition: number;
  totalPartitions: number;
  downloadedBytes: number;
  totalBytes: number;
  error: IndexSyncFailureDetails | null;
}

export interface NormalizedIndexPartitionFile {
  filename: string;
  compressedsize: number;
  uncompressedsize: number;
}

export interface NormalizedIndexPartition {
  number: number;
  folder: string;
  numberOfMessages: number;
  files: ReadonlyArray<NormalizedIndexPartitionFile>;
}

export interface NormalizedIndexManifest {
  partitions: ReadonlyArray<NormalizedIndexPartition>;
  totalCompressedBytes: number;
  totalUncompressedBytes: number;
  totalMessages: number;
}

export interface OpenIndexCommand {
  action: 'openIndex';
  operationId: string;
  localdir: string;
  partitionsdir: string;
}

export interface PrepareIndexReplacementCommand {
  action: 'prepareIndexReplacement';
  operationId: string;
}

export interface CatchUpRecentCommand {
  action: 'catchUpRecent';
  operationId: string;
  baseline: number;
  pageSize: number;
  publishSize: number;
  finalizeWatermark: boolean;
}

export interface AcknowledgeRecentChunkCommand {
  action: 'acknowledgeRecentChunk';
  operationId: string;
  page: number;
  batch: number;
}

export interface CancelInitialSyncCommand {
  action: 'cancelInitialSync';
  operationId: string;
}

export interface StartPeriodicSyncCommand {
  action: 'startPeriodicSync';
  operationId: string;
}

export type InitialIndexSyncWorkerCommand =
  | PrepareIndexReplacementCommand
  | OpenIndexCommand
  | CatchUpRecentCommand
  | AcknowledgeRecentChunkCommand
  | CancelInitialSyncCommand
  | StartPeriodicSyncCommand;

export interface WorkerIndexReadyEvent {
  action: 'workerIndexReady';
  operationId: string;
  baseline: number;
}

export interface IndexReplacementReadyEvent {
  action: 'indexReplacementReady';
  operationId: string;
}

export interface RecentChunkCommittedEvent {
  action: 'recentChunkCommitted';
  operationId: string;
  page: number;
  batch: number;
  batchSize: number;
  fetchedMessages: number;
  cumulativeCommitted: number;
}

export interface RecentCatchUpCompleteEvent {
  action: 'recentCatchUpComplete';
  operationId: string;
  fetchedMessages: number;
  committedMessages: number;
  watermarkCandidate: number;
}

export interface RecentCatchUpFailedEvent {
  action: 'recentCatchUpFailed';
  operationId: string;
  phase: 'opening-worker' | 'catching-up-recent' | 'final-reconciliation';
  code: string;
  message: string;
}

export interface InitialSyncCancelledEvent {
  action: 'initialSyncCancelled';
  operationId: string;
}

export type InitialIndexSyncWorkerEvent =
  | IndexReplacementReadyEvent
  | WorkerIndexReadyEvent
  | RecentChunkCommittedEvent
  | RecentCatchUpCompleteEvent
  | RecentCatchUpFailedEvent
  | InitialSyncCancelledEvent;
