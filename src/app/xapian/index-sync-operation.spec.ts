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

import { firstValueFrom } from 'rxjs';

import { IndexSyncOperation } from './index-sync-operation';

describe('IndexSyncOperation', () => {
  it('replays cancellation to subscribers attached after cancellation', async () => {
    const operation = new IndexSyncOperation();

    operation.cancel();

    await expectAsync(firstValueFrom(operation.cancelled$)).toBeResolved();
    expect(operation.cancelled).toBeTrue();
    expect(operation.signal.aborted).toBeTrue();
    expect(() => operation.throwIfCancelled()).toThrowError(/cancelled/i);
  });

  it('rejects an active retry delay when cancelled', async () => {
    const operation = new IndexSyncOperation();
    const waiting = operation.wait(60000);

    operation.cancel();

    await expectAsync(waiting).toBeRejectedWithError(/cancelled/i);
  });
});
