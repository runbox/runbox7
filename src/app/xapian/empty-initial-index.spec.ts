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

import { createEmptyInitialIndex } from './empty-initial-index';

describe('createEmptyInitialIndex', () => {
  it('closes and persists an empty writable index before reopening it read-only', async () => {
    const timeline: string[] = [];

    const messageCount = await createEmptyInitialIndex({
      openWritable: () => timeline.push('open-writable'),
      writeBaseline: baseline => timeline.push(`baseline-${baseline}`),
      closeWritable: () => timeline.push('close-writable'),
      persist: async () => {
        timeline.push('persist');
      },
      openReadOnly: () => timeline.push('open-read-only'),
      getMessageCount: () => {
        timeline.push('count');
        return 0;
      }
    });

    expect(timeline).toEqual([
      'open-writable',
      'baseline-0',
      'close-writable',
      'persist',
      'open-read-only',
      'count'
    ]);
    expect(messageCount).toBe(0);
  });
});
