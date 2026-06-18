// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2022 Runbox Solutions AS (runbox.com).
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

import { MailAddressInfo } from './mailaddressinfo';
import { MessageInfo } from './messageinfo';
import { MessageList } from './messagelist';

describe('MessageList', () => {
  it('should advertise sortable columns for non-index message lists', () => {
    const list = new MessageList([]);
    const columns = list.getCanvasTableColumns({ selectedFolder: 'Inbox' });

    expect(columns.find(column => column.name === 'Date').sortColumn).toBe(2);
    expect(columns.find(column => column.name === 'From').sortColumn).toBe(0);
    expect(columns.find(column => column.name === 'Subject').sortColumn).toBe(1);
    expect(columns.find(column => column.name === 'Size').sortColumn).toBe(3);
  });

  it('should sort non-index messages by subject, date, size, and address', () => {
    const list = new MessageList([
      createMessage(1, '2026-01-03T00:00:00Z', 'Charlie <charlie@example.com>', 'Zed <zed@example.com>', 'gamma', 300),
      createMessage(2, '2026-01-01T00:00:00Z', 'alice@example.com', 'Yvonne <yvonne@example.com>', 'Alpha', 100),
      createMessage(3, '2026-01-02T00:00:00Z', 'Bob <bob@example.com>', 'xavier@example.com', 'beta', 200),
    ]);

    list.sortBy(1, false, 'Inbox');
    expect(rowIds(list)).toEqual([2, 3, 1]);

    list.sortBy(2, true, 'Inbox');
    expect(rowIds(list)).toEqual([1, 3, 2]);

    list.sortBy(3, false, 'Inbox');
    expect(rowIds(list)).toEqual([2, 3, 1]);

    list.sortBy(0, false, 'Inbox');
    expect(rowIds(list)).toEqual([2, 3, 1]);

    list.sortBy(0, false, 'Sent');
    expect(rowIds(list)).toEqual([3, 2, 1]);
  });

  it('should keep filtered rows in the current sorted order', () => {
    const list = new MessageList([
      createMessage(1, '2026-01-01T00:00:00Z', 'one@example.com', 'to@example.com', 'Zulu', 100, true),
      createMessage(2, '2026-01-02T00:00:00Z', 'two@example.com', 'to@example.com', 'Alpha', 100, false),
      createMessage(3, '2026-01-03T00:00:00Z', 'three@example.com', 'to@example.com', 'Beta', 100, false),
    ]);
    const options = new Map<string, boolean>();
    options.set('unreadOnly', true);

    list.sortBy(1, false, 'Inbox');
    list.filterBy(options);

    expect(rowIds(list)).toEqual([2, 3]);
  });
});

function rowIds(list: MessageList): number[] {
  return list.rows.map((row: MessageInfo) => row.id);
}

function createMessage(
  id: number,
  messageDate: string,
  from: string,
  to: string,
  subject: string,
  size: number,
  seenFlag = false
): MessageInfo {
  return new MessageInfo(
    id,
    new Date(messageDate),
    new Date(messageDate),
    'Inbox',
    seenFlag,
    false,
    false,
    MailAddressInfo.parse(from),
    MailAddressInfo.parse(to),
    [],
    [],
    subject,
    '',
    size,
    false
  );
}
