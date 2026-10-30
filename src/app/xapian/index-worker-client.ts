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

import { Subject } from 'rxjs';

import {
  INITIAL_SYNC_PAGE_SIZE,
  InitialIndexSyncWorkerCommand,
  InitialIndexSyncWorkerEvent,
  RecentCatchUpFailedEvent,
  VISIBLE_INDEX_BATCH_SIZE
} from './index-sync.types';

const INITIAL_SYNC_EVENT_ACTIONS = new Set<InitialIndexSyncWorkerEvent['action']>([
  'workerIndexReady',
  'indexReplacementReady',
  'recentChunkCommitted',
  'recentCatchUpComplete',
  'recentCatchUpFailed',
  'initialSyncCancelled'
]);

export class IndexWorkerClient {
  private operationId: string = null;
  private workerOpenPending = false;
  private workerFailure: RecentCatchUpFailedEvent = null;
  public readonly events = new Subject<InitialIndexSyncWorkerEvent>();

  constructor(private worker: Worker) {}

  public startOperation(operationId: string): void {
    this.operationId = operationId;
    this.workerOpenPending = false;
    this.workerFailure = null;
  }

  public openIndex(localdir: string, partitionsdir: string): void {
    this.workerOpenPending = true;
    this.postMessage({
      action: 'openIndex',
      operationId: this.requireOperationId(),
      localdir,
      partitionsdir
    });
  }

  public prepareIndexReplacement(): void {
    this.postMessage({
      action: 'prepareIndexReplacement',
      operationId: this.requireOperationId()
    });
  }

  public catchUpRecent(baseline: number, finalizeWatermark: boolean): void {
    this.postMessage({
      action: 'catchUpRecent',
      operationId: this.requireOperationId(),
      baseline,
      pageSize: INITIAL_SYNC_PAGE_SIZE,
      publishSize: VISIBLE_INDEX_BATCH_SIZE,
      finalizeWatermark
    });
  }

  public acknowledgeRecentChunk(page: number, batch: number): void {
    this.postMessage({
      action: 'acknowledgeRecentChunk',
      operationId: this.requireOperationId(),
      page,
      batch
    });
  }

  public cancelInitialSync(): void {
    this.postMessage({
      action: 'cancelInitialSync',
      operationId: this.requireOperationId()
    });
  }

  public startPeriodicSync(): void {
    this.postMessage({
      action: 'startPeriodicSync',
      operationId: this.requireOperationId()
    });
  }

  public reportWorkerFailure(
    message: string,
    phase: RecentCatchUpFailedEvent['phase'] = 'catching-up-recent'
  ): void {
    if (!this.operationId) {
      return;
    }
    this.workerFailure = {
      action: 'recentCatchUpFailed',
      operationId: this.operationId,
      phase,
      code: 'worker-crashed',
      message
    };
    if (phase === 'opening-worker') {
      if (!this.workerOpenPending) {
        return;
      }
      this.workerOpenPending = false;
    }
    this.events.next(this.workerFailure);
  }

  public getWorkerFailure(): RecentCatchUpFailedEvent {
    return this.workerFailure;
  }

  public handleMessage(data: unknown): boolean {
    if (!data || typeof data !== 'object' || !('action' in data)) {
      return false;
    }

    const action = (data as { action: string }).action;
    if (!INITIAL_SYNC_EVENT_ACTIONS.has(action as InitialIndexSyncWorkerEvent['action'])) {
      return false;
    }

    const event = data as InitialIndexSyncWorkerEvent;
    if (event.operationId === this.operationId) {
      const openingTerminal = event.action === 'workerIndexReady' ||
        (event.action === 'recentCatchUpFailed' && event.phase === 'opening-worker');
      if (openingTerminal) {
        if (!this.workerOpenPending) {
          return true;
        }
        this.workerOpenPending = false;
      }
      this.events.next(event);
    }
    return true;
  }

  private postMessage(command: InitialIndexSyncWorkerCommand): void {
    this.worker.postMessage(command);
  }

  private requireOperationId(): string {
    if (!this.operationId) {
      throw new Error('No initial index synchronization operation is active');
    }
    return this.operationId;
  }
}
