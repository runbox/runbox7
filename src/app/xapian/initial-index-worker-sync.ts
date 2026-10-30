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
import {
  CatchUpRecentCommand,
  InitialIndexSyncWorkerEvent,
  RecentChunkCommittedEvent
} from './index-sync.types';
import { runRecentIndexSync } from './recent-index-sync';

export interface InitialIndexWorkerSyncDependencies {
  fetchPage: (
    page: number,
    baseline: number,
    pageSize: number
  ) => Promise<MessageInfo[]>;
  fetchDeletedMessages: (baseline: number) => Promise<number[]>;
  commitBatch: (messages: MessageInfo[], deletedMessageIds: number[]) => Promise<void>;
  finalizeWatermark: (watermark: number) => Promise<void>;
  persist: () => Promise<void>;
  postEvent: (event: InitialIndexSyncWorkerEvent) => void;
  reportFailure?: (phase: string, error: unknown) => void;
}

export class InitialIndexWorkerSync {
  private operationId: string = null;
  private cancelled = false;
  private pendingRecentChunk: {
    operationId: string;
    page: number;
    batch: number;
    resolve: () => void;
  } = null;

  constructor(private dependencies: InitialIndexWorkerSyncDependencies) {}

  public startOperation(operationId: string): void {
    this.operationId = operationId;
    this.cancelled = false;
  }

  public cancel(operationId: string): void {
    if (operationId === this.operationId) {
      this.cancelled = true;
      this.releasePendingRecentChunk();
    }
  }

  public acknowledgeRecentChunk(operationId: string, page: number, batch: number): void {
    if (this.pendingRecentChunk?.operationId === operationId &&
      this.pendingRecentChunk.page === page &&
      this.pendingRecentChunk.batch === batch) {
      this.releasePendingRecentChunk();
    }
  }

  public async catchUp(command: CatchUpRecentCommand): Promise<void> {
    if (command.operationId !== this.operationId) {
      return;
    }

    try {
      const deletedMessageIds = await this.dependencies.fetchDeletedMessages(command.baseline);
      let deletionsCommitted = false;
      const result = await runRecentIndexSync({
        operationId: command.operationId,
        baseline: command.baseline,
        pageSize: command.pageSize,
        publishSize: command.publishSize,
        fetchPage: this.dependencies.fetchPage,
        commitBatch: async messages => {
          await this.dependencies.commitBatch(
            messages,
            deletionsCommitted ? [] : deletedMessageIds
          );
          deletionsCommitted = true;
          await this.dependencies.persist();
        },
        isCancelled: () => this.cancelled,
        onBatchCommitted: event => this.publishRecentChunk(event)
      });

      if (result.cancelled) {
        this.dependencies.postEvent({
          action: 'initialSyncCancelled',
          operationId: command.operationId
        });
        return;
      }

      if (!deletionsCommitted && deletedMessageIds.length > 0) {
        await this.dependencies.commitBatch([], deletedMessageIds);
        await this.dependencies.persist();
      }

      if (command.finalizeWatermark) {
        await this.dependencies.finalizeWatermark(result.watermarkCandidate);
        await this.dependencies.persist();
      }

      this.dependencies.postEvent({
        action: 'recentCatchUpComplete',
        operationId: command.operationId,
        fetchedMessages: result.fetchedMessages,
        committedMessages: result.committedMessages,
        watermarkCandidate: result.watermarkCandidate
      });
    } catch (error) {
      const phase = command.finalizeWatermark
        ? 'final-reconciliation'
        : 'catching-up-recent';
      this.dependencies.reportFailure?.(phase, error);
      this.dependencies.postEvent({
        action: 'recentCatchUpFailed',
        operationId: command.operationId,
        phase,
        code: 'recent-sync-failed',
        message: 'Unable to synchronize recent messages'
      });
    }
  }

  private publishRecentChunk(event: RecentChunkCommittedEvent): Promise<void> {
    return new Promise(resolve => {
      this.pendingRecentChunk = {
        operationId: event.operationId,
        page: event.page,
        batch: event.batch,
        resolve
      };
      this.dependencies.postEvent(event);
    });
  }

  private releasePendingRecentChunk(): void {
    const pendingRecentChunk = this.pendingRecentChunk;
    this.pendingRecentChunk = null;
    pendingRecentChunk?.resolve();
  }
}
