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

function message(id: number, seenFlag = false) {
  return {
    id,
    seenFlag,
    messageDate: new Date('2026-06-10T09:00:00Z'),
    from: [],
    to: [],
    subject: `message ${id}`,
    plaintext: '',
    size: 0,
    attachment: false,
    answeredFlag: false,
    flaggedFlag: false,
  };
}

describe('MessageList', () => {
  it('keeps the opened message highlighted when new rows are inserted above it', () => {
    const messageList = new MessageList([
      message(3),
      message(2),
      message(1),
    ]);

    messageList.rowSelected(1, 1, false);

    messageList.setRows([
      message(4),
      message(3),
      message(2),
      message(1),
    ]);

    expect(messageList.openedRowIndex).toBe(2);
    expect(messageList.isOpenedRow(0)).toBeFalse();
    expect(messageList.isOpenedRow(1)).toBeFalse();
    expect(messageList.isOpenedRow(2)).toBeTrue();
  });

  it('restores the opened highlight after filters hide and show the opened row', () => {
    const messageList = new MessageList([
      message(3, false),
      message(2, true),
      message(1, false),
    ]);
    const unreadOnly = new Map<string, boolean>();

    messageList.rowSelected(1, 1, false);

    unreadOnly.set('unreadOnly', true);
    messageList.filterBy(unreadOnly);

    expect(messageList.openedRowIndex).toBeNull();
    expect(messageList.rows.map((row) => row.id)).toEqual([3, 1]);

    unreadOnly.set('unreadOnly', false);
    messageList.filterBy(unreadOnly);

    expect(messageList.openedRowIndex).toBe(1);
    expect(messageList.isOpenedRow(1)).toBeTrue();
  });
});
