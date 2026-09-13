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

import { rehydratePublishedIndexView } from './published-index-view';

describe('published index view', () => {
  it('replaces the stale local directory before opening a committed worker batch', async () => {
    const timeline: string[] = [];

    await rehydratePublishedIndexView({
      close: () => timeline.push('close'),
      removeLocalCopy: () => timeline.push('remove-local'),
      populate: async () => {
        timeline.push('populate');
      },
      openMainPartition: () => timeline.push('open-main'),
      openHistoricalPartitions: () => timeline.push('open-history'),
      activate: () => timeline.push('activate'),
      fallback: () => timeline.push('fallback')
    });

    expect(timeline).toEqual([
      'close',
      'remove-local',
      'populate',
      'open-main',
      'open-history',
      'activate'
    ]);
  });

  it('falls back without opening the index when filesystem population fails', async () => {
    const timeline: string[] = [];
    const failure = new Error('FS EEXIST');

    await expectAsync(rehydratePublishedIndexView({
      close: () => timeline.push('close'),
      removeLocalCopy: () => timeline.push('remove-local'),
      populate: async () => {
        timeline.push('populate');
        throw failure;
      },
      openMainPartition: () => timeline.push('open-main'),
      openHistoricalPartitions: () => timeline.push('open-history'),
      activate: () => timeline.push('activate'),
      fallback: () => timeline.push('fallback')
    })).toBeRejectedWith(failure);

    expect(timeline).toEqual([
      'close',
      'remove-local',
      'populate',
      'fallback'
    ]);
  });
});
