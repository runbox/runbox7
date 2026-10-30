// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2026 Runbox Solutions AS (runbox.com).
//
// This file is part of Runbox 7.
//
// Runbox 7 is free software: you can redistribute it and/or modify it
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

import { Observable, ReplaySubject } from 'rxjs';
import { take } from 'rxjs/operators';

export class IndexSyncCancelledError extends Error {
  constructor() {
    super('Initial index synchronization cancelled');
    this.name = 'IndexSyncCancelledError';
  }
}

export class IndexSyncOperation {
  private readonly abortController = new AbortController();
  private readonly cancellationSubject = new ReplaySubject<void>(1);

  public readonly cancelled$: Observable<void> = this.cancellationSubject.asObservable();

  public get cancelled(): boolean {
    return this.abortController.signal.aborted;
  }

  public get signal(): AbortSignal {
    return this.abortController.signal;
  }

  public cancel(): void {
    if (this.cancelled) {
      return;
    }
    this.abortController.abort();
    this.cancellationSubject.next();
    this.cancellationSubject.complete();
  }

  public throwIfCancelled(): void {
    if (this.cancelled) {
      throw new IndexSyncCancelledError();
    }
  }

  public wait(delayMilliseconds: number): Promise<void> {
    this.throwIfCancelled();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        subscription.unsubscribe();
        resolve();
      }, delayMilliseconds);
      const subscription = this.cancelled$.pipe(take(1)).subscribe(() => {
        clearTimeout(timeout);
        reject(new IndexSyncCancelledError());
      });
    });
  }
}
