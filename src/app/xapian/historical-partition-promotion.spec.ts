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
  HistoricalPartitionPromotionDependencies,
  promoteHistoricalPartition
} from './historical-partition-promotion';
import { IndexSyncError } from './index-sync.types';

describe('promoteHistoricalPartition', () => {
  const dependencies = (
    timeline: string[],
    overrides: Partial<HistoricalPartitionPromotionDependencies> = {}
  ): HistoricalPartitionPromotionDependencies => ({
    backupExisting: async () => {
      timeline.push('backup-existing');
      return true;
    },
    promote: () => timeline.push('promote'),
    persist: async () => {
      timeline.push('persist');
    },
    reopenWorker: async () => {
      timeline.push('worker');
    },
    openMainView: () => timeline.push('main'),
    removeBackup: async () => {
      timeline.push('remove-backup');
    },
    removePromoted: async () => {
      timeline.push('remove-replacement');
    },
    restoreBackup: async () => {
      timeline.push('restore-existing');
    },
    ...overrides
  });

  it('retains the backup until both views open and final cleanup persists', async () => {
    const timeline: string[] = [];

    await promoteHistoricalPartition(dependencies(timeline));

    expect(timeline).toEqual([
      'backup-existing',
      'persist',
      'promote',
      'persist',
      'worker',
      'main',
      'remove-backup',
      'persist'
    ]);
  });

  it('does not persist or remove a backup when no existing partition is present', async () => {
    const timeline: string[] = [];

    await promoteHistoricalPartition(dependencies(timeline, {
      backupExisting: async () => {
        timeline.push('no-existing');
        return false;
      }
    }));

    expect(timeline).toEqual([
      'no-existing', 'promote', 'persist', 'worker', 'main'
    ]);
  });

  [
    { name: 'promotion persistence', failureAt: 'persist-promotion' },
    { name: 'worker open', failureAt: 'worker' },
    { name: 'main-view open', failureAt: 'main' }
  ].forEach(({ name, failureAt }) => {
    it(`restores and persists the existing partition after ${name} fails`, async () => {
      const timeline: string[] = [];
      let persistCalls = 0;

      await expectAsync(promoteHistoricalPartition(dependencies(timeline, {
        persist: async () => {
          timeline.push('persist');
          persistCalls++;
          if (failureAt === 'persist-promotion' && persistCalls === 2) {
            throw new Error('replacement failed');
          }
        },
        reopenWorker: async () => {
          timeline.push('worker');
          if (failureAt === 'worker') {
            throw new Error('replacement failed');
          }
        },
        openMainView: () => {
          timeline.push('main');
          if (failureAt === 'main') {
            throw new Error('replacement failed');
          }
        }
      }))).toBeRejectedWithError(/replacement failed/);

      expect(timeline).toContain('remove-replacement');
      expect(timeline).toContain('restore-existing');
      expect(timeline.slice(-3)).toEqual([
        'remove-replacement', 'restore-existing', 'persist'
      ]);
      expect(timeline).not.toContain('remove-backup');
    });
  });

  it('removes an uncommitted replacement after failure when there was no backup', async () => {
    const timeline: string[] = [];

    await expectAsync(promoteHistoricalPartition(dependencies(timeline, {
      backupExisting: async () => false,
      reopenWorker: async () => {
        throw new Error('replacement failed');
      },
      removePromoted: async () => {
        timeline.push('remove-replacement');
      },
      restoreBackup: async () => {
        timeline.push('no-backup-to-restore');
      }
    }))).toBeRejectedWithError(/replacement failed/);

    expect(timeline.slice(-3)).toEqual([
      'remove-replacement', 'no-backup-to-restore', 'persist'
    ]);
  });

  it('reports rollback failure distinctly while retaining the replacement failure as cause', async () => {
    const replacementFailure = new Error('replacement failed');
    let rejected: unknown;

    try {
      await promoteHistoricalPartition(dependencies([], {
        reopenWorker: async () => {
          throw replacementFailure;
        },
        restoreBackup: async () => {
          throw new Error('rollback failed');
        }
      }));
    } catch (error) {
      rejected = error;
    }

    expect(rejected).toEqual(jasmine.any(IndexSyncError));
    expect((rejected as IndexSyncError).details.category).toBe('rollback');
    expect((rejected as IndexSyncError).cause).toBe(replacementFailure);
    expect((rejected as Error).message).toContain('rollback failed');
  });
});
