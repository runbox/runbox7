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

import { IndexPublicationQueue } from './index-publication-queue';

describe('IndexPublicationQueue', () => {
  it('serializes publication and coalesces legacy requests into one follow-up', async () => {
    let releaseAcknowledged: () => void;
    let releaseLegacy: () => void;
    let markLegacyStarted: () => void;
    const acknowledgedGate = new Promise<void>(resolve => releaseAcknowledged = resolve);
    const legacyGate = new Promise<void>(resolve => releaseLegacy = resolve);
    const legacyStarted = new Promise<void>(resolve => markLegacyStarted = resolve);
    let calls = 0;
    let active = 0;
    let maximumActive = 0;
    const queue = new IndexPublicationQueue({
      rehydrate: async () => {
        calls++;
        active++;
        maximumActive = Math.max(maximumActive, active);
        if (calls === 1) {
          await acknowledgedGate;
        } else {
          markLegacyStarted();
          await legacyGate;
        }
        active--;
      }
    });

    const acknowledged = queue.publish('acknowledged');
    const legacy = [
      queue.publish('legacy'),
      queue.publish('legacy'),
      queue.publish('legacy')
    ];

    expect(calls).toBe(1);
    expect(maximumActive).toBe(1);
    releaseAcknowledged();
    await acknowledged;
    await legacyStarted;
    expect(calls).toBe(2);
    expect(maximumActive).toBe(1);

    releaseLegacy();
    await Promise.all(legacy);
    expect(calls).toBe(2);
    expect(maximumActive).toBe(1);
  });

  it('rejects acknowledged failure and recovers for later publication', async () => {
    const failure = new Error('historical partition failed');
    let calls = 0;
    const queue = new IndexPublicationQueue({
      rehydrate: async () => {
        calls++;
        if (calls === 1) {
          throw failure;
        }
      }
    });

    await expectAsync(queue.publish('acknowledged')).toBeRejectedWith(failure);
    await expectAsync(queue.publish('legacy')).toBeResolved();
    expect(calls).toBe(2);
  });
});
