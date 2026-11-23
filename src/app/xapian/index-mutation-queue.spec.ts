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

import { IndexMutationQueue } from './index-mutation-queue';

describe('IndexMutationQueue', () => {
  it('processes batches in FIFO order and waits for active persistence', async () => {
    const timeline: string[] = [];
    let releasePersistence: () => void;
    let markPersistenceStarted: () => void;
    const firstPersistence = new Promise<void>(resolve => {
      releasePersistence = resolve;
    });
    const persistenceStarted = new Promise<void>(resolve => {
      markPersistenceStarted = resolve;
    });
    let persistCalls = 0;
    const queue = new IndexMutationQueue({
      commit: async () => timeline.push('commit'),
      persist: async () => {
        timeline.push('persist');
        persistCalls++;
        if (persistCalls === 1) {
          markPersistenceStarted();
          await firstPersistence;
        }
      },
      publishLegacy: async () => timeline.push('publish')
    });

    const first = queue.enqueue([
      async () => timeline.push('first-1'),
      async () => timeline.push('first-2')
    ], true);
    const second = queue.enqueue([
      async () => timeline.push('second')
    ], false);
    await persistenceStarted;

    expect(timeline).toEqual(['first-1', 'first-2', 'commit', 'persist']);
    releasePersistence();
    await Promise.all([first, second]);

    expect(timeline).toEqual([
      'first-1', 'first-2', 'commit', 'persist', 'publish',
      'second', 'commit', 'persist'
    ]);
  });

  it('rejects active and queued callers, resets, and accepts later work', async () => {
    const persistenceFailure = new Error('persistence failed');
    const mutations: string[] = [];
    const publications: string[] = [];
    let shouldFail = true;
    const queue = new IndexMutationQueue({
      commit: async () => undefined,
      persist: async () => {
        if (shouldFail) {
          throw persistenceFailure;
        }
      },
      publishLegacy: async () => publications.push('legacy')
    });

    const results = await Promise.allSettled([
      queue.enqueue([async () => mutations.push('active')], false),
      queue.enqueue([async () => mutations.push('queued')], true)
    ]);

    expect(results[0]).toEqual({ status: 'rejected', reason: persistenceFailure });
    expect(results[1]).toEqual({ status: 'rejected', reason: persistenceFailure });
    expect(mutations).toEqual(['active']);
    expect(publications).toEqual([]);
    await expectAsync(queue.whenIdle()).toBeResolved();

    shouldFail = false;
    await queue.enqueue([async () => mutations.push('later')], true);

    expect(mutations).toEqual(['active', 'later']);
    expect(publications).toEqual(['legacy']);
    await expectAsync(queue.whenIdle()).toBeResolved();
  });

  it('keeps whenIdle pending until persistence and publication finish', async () => {
    let releasePublication: () => void;
    let markPublicationStarted: () => void;
    const publication = new Promise<void>(resolve => {
      releasePublication = resolve;
    });
    const publicationStarted = new Promise<void>(resolve => {
      markPublicationStarted = resolve;
    });
    let idle = false;
    const queue = new IndexMutationQueue({
      commit: async () => undefined,
      persist: async () => undefined,
      publishLegacy: async () => {
        markPublicationStarted();
        await publication;
      }
    });

    const batch = queue.enqueue([async () => undefined], true);
    void queue.whenIdle().then(() => idle = true);
    await publicationStarted;

    expect(idle).toBeFalse();
    releasePublication();
    await batch;
    await queue.whenIdle();
    expect(idle).toBeTrue();
  });
});
