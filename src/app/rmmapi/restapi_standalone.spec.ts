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

import { listAllMessages, listDeletedMessagesSince } from './restapi_standalone';

describe('listAllMessages', () => {
  it('rejects a failed response instead of reporting an empty page', async () => {
    spyOn(window, 'fetch').and.resolveTo(new Response('', {
      status: 503,
      statusText: 'Service Unavailable'
    }));

    await expectAsync(listAllMessages(0, 0, 0, 1000, true))
      .toBeRejectedWithError(/Service Unavailable/);
  });

  it('rejects a failed deleted-message response instead of losing deletions', async () => {
    spyOn(window, 'fetch').and.resolveTo(new Response('', {
      status: 503,
      statusText: 'Service Unavailable'
    }));

    await expectAsync(listDeletedMessagesSince(new Date(0)))
      .toBeRejectedWithError(/Service Unavailable/);
  });
});
