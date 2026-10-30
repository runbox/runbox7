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

type FolderMessageFetcher = (
  page: number,
  startId: number,
  startDate: number,
  limit: number,
  skipContent: boolean,
  folder?: string,
  signal?: AbortSignal
) => Promise<MessageInfo[]>;

export function fetchFolderMessagesForCountComparison(
  folder: string,
  signal: AbortSignal,
  fetchMessages: FolderMessageFetcher
): Promise<MessageInfo[]> {
  return fetchMessages(0, 0, 0, 50000, true, folder, signal);
}

export class LegacyIndexUpdateCancellation {
  private controller = new AbortController();

  public get signal(): AbortSignal {
    return this.controller.signal;
  }

  public cancelActive(): void {
    this.controller.abort();
    this.controller = new AbortController();
  }
}
