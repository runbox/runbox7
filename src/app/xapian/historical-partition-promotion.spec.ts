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

import { promoteHistoricalPartition } from './historical-partition-promotion';

describe('promoteHistoricalPartition', () => {
  it('removes and persists a promoted partition when opening it fails', async () => {
    const timeline: string[] = [];

    await expectAsync(promoteHistoricalPartition({
      removeExisting: async () => {
        timeline.push('remove-existing');
      },
      promote: () => timeline.push('promote'),
      persist: async () => {
        timeline.push('persist');
      },
      open: () => {
        timeline.push('open');
        throw new Error('invalid partition');
      },
      reopenWorker: async () => {
        timeline.push('worker');
      },
      removePromoted: async () => {
        timeline.push('remove');
      }
    })).toBeRejectedWithError(/invalid partition/);

    expect(timeline).toEqual([
      'remove-existing', 'promote', 'persist', 'worker', 'open', 'remove'
    ]);
  });

  it('reopens the worker on each promoted historical partition', async () => {
    const timeline: string[] = [];

    await promoteHistoricalPartition({
      removeExisting: async () => {
        timeline.push('remove-existing');
      },
      promote: () => timeline.push('promote'),
      persist: async () => {
        timeline.push('persist');
      },
      open: () => timeline.push('open'),
      reopenWorker: async () => {
        timeline.push('worker');
      },
      removePromoted: async () => {
        timeline.push('remove');
      }
    });

    expect(timeline).toEqual([
      'remove-existing', 'promote', 'persist', 'worker', 'open'
    ]);
  });
});
