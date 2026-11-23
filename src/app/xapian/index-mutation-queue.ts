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

export interface IndexMutationQueueDependencies {
  commit: () => unknown | Promise<unknown>;
  persist: () => Promise<unknown>;
  publishLegacy: () => unknown | Promise<unknown>;
}

interface IndexMutationBatch {
  mutations: Array<() => unknown | Promise<unknown>>;
  publishLegacy: boolean;
  resolve: () => void;
  reject: (error: unknown) => void;
}

export class IndexMutationQueue {
  private batches: IndexMutationBatch[] = [];
  private processing = false;
  private idlePromise = Promise.resolve();
  private resolveIdle: () => void = null;

  constructor(private dependencies: IndexMutationQueueDependencies) {}

  public enqueue(
    mutations: Array<() => unknown | Promise<unknown>>,
    publishLegacy: boolean
  ): Promise<void> {
    const result = new Promise<void>((resolve, reject) => {
      this.batches.push({ mutations, publishLegacy, resolve, reject });
    });
    if (!this.processing) {
      this.processing = true;
      this.idlePromise = new Promise<void>(resolve => this.resolveIdle = resolve);
      void this.drain();
    }
    return result;
  }

  public whenIdle(): Promise<void> {
    return this.idlePromise;
  }

  private async drain(): Promise<void> {
    while (this.batches.length > 0) {
      const batch = this.batches.shift();
      try {
        for (const mutation of batch.mutations) {
          await mutation();
        }
        await this.dependencies.commit();
        await this.dependencies.persist();
        if (batch.publishLegacy) {
          await this.dependencies.publishLegacy();
        }
        batch.resolve();
      } catch (error) {
        batch.reject(error);
        this.batches.splice(0).forEach(queued => queued.reject(error));
        break;
      }
    }
    this.processing = false;
    this.resolveIdle();
    this.resolveIdle = null;
  }
}
