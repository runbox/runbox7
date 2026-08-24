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
import { RecentChunkCommittedEvent } from './index-sync.types';

export interface RecentIndexSyncBatchContext {
  page: number;
  batch: number;
}

export interface RecentIndexSyncDependencies {
  operationId: string;
  baseline: number;
  pageSize: number;
  publishSize: number;
  fetchPage: (
    page: number,
    baseline: number,
    pageSize: number
  ) => Promise<MessageInfo[]>;
  commitBatch: (
    messages: MessageInfo[],
    context: RecentIndexSyncBatchContext
  ) => Promise<void>;
  isCancelled: () => boolean;
  onBatchCommitted: (event: RecentChunkCommittedEvent) => void;
}

export interface RecentIndexSyncResult {
  fetchedMessages: number;
  committedMessages: number;
  watermarkCandidate: number;
  cancelled: boolean;
}

const messageWatermark = (message: MessageInfo): number => Math.min(
  Date.now(),
  Math.max(
    message.changedDate ? message.changedDate.getTime() : 0,
    message.messageDate ? message.messageDate.getTime() : 0
  )
);

export const runRecentIndexSync = async (
  dependencies: RecentIndexSyncDependencies
): Promise<RecentIndexSyncResult> => {
  let page = 0;
  let fetchedMessages = 0;
  let committedMessages = 0;
  let watermarkCandidate = dependencies.baseline;

  const result = (cancelled: boolean): RecentIndexSyncResult => ({
    fetchedMessages,
    committedMessages,
    watermarkCandidate,
    cancelled
  });

  while (!dependencies.isCancelled()) {
    const fetchedPage = await dependencies.fetchPage(
      page,
      dependencies.baseline,
      dependencies.pageSize
    );
    const sortedPage = [...fetchedPage].sort((left, right) => right.id - left.id);
    fetchedMessages += sortedPage.length;

    for (let offset = 0, batch = 0;
      offset < sortedPage.length;
      offset += dependencies.publishSize, batch++) {
      if (dependencies.isCancelled()) {
        return result(true);
      }

      const messages = sortedPage.slice(offset, offset + dependencies.publishSize);
      await dependencies.commitBatch(messages, { page, batch });
      committedMessages += messages.length;
      watermarkCandidate = messages.reduce((candidate, message) =>
        Math.max(candidate, messageWatermark(message)), watermarkCandidate);

      dependencies.onBatchCommitted({
        action: 'recentChunkCommitted',
        operationId: dependencies.operationId,
        page,
        batch,
        batchSize: messages.length,
        fetchedMessages,
        cumulativeCommitted: committedMessages
      });
    }

    if (sortedPage.length < dependencies.pageSize) {
      return result(false);
    }
    page++;
  }

  return result(true);
};
