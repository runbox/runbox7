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

import { IndexSyncError } from './index-sync.types';

export interface HistoricalPartitionPromotionDependencies {
  backupExisting: () => Promise<boolean | void>;
  promote: () => void;
  persist: () => Promise<void>;
  reopenWorker: () => Promise<void>;
  openMainView: () => void;
  removeBackup: () => Promise<void>;
  removePromoted: () => Promise<void>;
  restoreBackup: () => Promise<void>;
}

export async function promoteHistoricalPartition(
  dependencies: HistoricalPartitionPromotionDependencies
): Promise<void> {
  let rollbackRequired = false;
  let hasBackup = false;
  try {
    hasBackup = await dependencies.backupExisting() !== false;
    rollbackRequired = hasBackup;
    if (hasBackup) {
      await dependencies.persist();
    }
    rollbackRequired = true;
    dependencies.promote();
    await dependencies.persist();
    await dependencies.reopenWorker();
    dependencies.openMainView();
    rollbackRequired = false;
    if (hasBackup) {
      await dependencies.removeBackup();
      await dependencies.persist();
    }
  } catch (error) {
    if (!rollbackRequired) {
      throw error;
    }
    try {
      await dependencies.removePromoted();
      await dependencies.restoreBackup();
      await dependencies.persist();
    } catch (rollbackError) {
      throw new IndexSyncError({
        operationId: '',
        phase: 'downloading-history',
        page: null,
        partition: null,
        attempt: 1,
        category: 'rollback',
        recoverable: false,
        message: `Unable to restore the previous historical partition: ${
          rollbackError instanceof Error ? rollbackError.message : String(rollbackError)
        }`
      }, error);
    }
    throw error;
  }
}
