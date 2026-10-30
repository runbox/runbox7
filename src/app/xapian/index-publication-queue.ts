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

export type IndexPublicationRequest = 'acknowledged' | 'legacy';

export interface IndexPublicationQueueDependencies {
  rehydrate: () => Promise<void>;
}

interface PublicationWaiter {
  resolve: () => void;
  reject: (error: unknown) => void;
}

interface PublicationJob {
  request: IndexPublicationRequest;
  waiters: PublicationWaiter[];
}

export class IndexPublicationQueue {
  private jobs: PublicationJob[] = [];
  private processing = false;

  constructor(private dependencies: IndexPublicationQueueDependencies) {}

  public publish(request: IndexPublicationRequest): Promise<void> {
    const result = new Promise<void>((resolve, reject) => {
      const queuedLegacy = request === 'legacy'
        ? this.jobs.find(job => job.request === 'legacy')
        : null;
      if (queuedLegacy) {
        queuedLegacy.waiters.push({ resolve, reject });
      } else {
        this.jobs.push({ request, waiters: [{ resolve, reject }] });
      }
    });
    if (!this.processing) {
      this.processing = true;
      void this.drain();
    }
    return result;
  }

  private async drain(): Promise<void> {
    while (this.jobs.length > 0) {
      const job = this.jobs.shift();
      try {
        await this.dependencies.rehydrate();
        job.waiters.forEach(waiter => waiter.resolve());
      } catch (error) {
        job.waiters.forEach(waiter => waiter.reject(error));
      }
    }
    this.processing = false;
  }
}
