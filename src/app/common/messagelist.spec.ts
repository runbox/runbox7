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

import { MessageList } from './messagelist';

describe('MessageList', () => {
  it('uses the row folder when choosing from or to values', () => {
    const rows = [
      {
        id: 1,
        folder: 'Inbox',
        from: [{ name: 'Inbox Sender', address: 'sender@example.test' }],
        to: [{ name: 'Inbox Recipient', address: 'recipient@example.test' }],
        seenFlag: true,
      },
      {
        id: 2,
        folder: 'Sent',
        from: [{ name: 'Sent Sender', address: 'me@example.test' }],
        to: [{ name: 'Sent Recipient', address: 'sent@example.test' }],
        seenFlag: true,
      },
      {
        id: 3,
        folder: 'Sent.Archive',
        from: [{ name: 'Subsent Sender', address: 'me@example.test' }],
        to: [{ name: 'Subsent Recipient', address: 'subsent@example.test' }],
        seenFlag: true,
      },
    ];

    const list = new MessageList(rows);
    const columns = list.getCanvasTableColumns({ selectedFolder: 'Sent' });
    const fromOrToColumn = columns.find(column => column.cacheKey === 'from');

    expect(fromOrToColumn.getValue(0)).toBe('Inbox Sender');
    expect(fromOrToColumn.getValue(1)).toBe('Sent Recipient');
    expect(fromOrToColumn.getValue(2)).toBe('Subsent Recipient');
  });
});
