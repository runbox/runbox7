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
  fetchFolderMessagesForCountComparison,
  LegacyIndexUpdateCancellation
} from './legacy-index-update-cancellation';

describe('legacy index update cancellation', () => {
  it('aborts the active update and gives the next update a fresh signal', () => {
    const cancellation = new LegacyIndexUpdateCancellation();
    const activeSignal = cancellation.signal;

    cancellation.cancelActive();

    expect(activeSignal.aborted).toBeTrue();
    expect(cancellation.signal).not.toBe(activeSignal);
    expect(cancellation.signal.aborted).toBeFalse();
  });

  it('aborts folder discrepancy fetching before index replacement', async () => {
    const cancellation = new LegacyIndexUpdateCancellation();
    let requestSignal: AbortSignal;
    const request = fetchFolderMessagesForCountComparison(
      'Inbox',
      cancellation.signal,
      async (_page, _startId, _startDate, _limit, _skip, _folder, signal) => {
        requestSignal = signal;
        return new Promise((_resolve, reject) => signal.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError'))
        ));
      }
    );

    cancellation.cancelActive();

    await expectAsync(request).toBeRejectedWithError(DOMException, 'Aborted');
    expect(requestSignal.aborted).toBeTrue();
    expect(cancellation.signal.aborted).toBeFalse();
  });
});
