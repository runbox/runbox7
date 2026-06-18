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
import { MessageList } from './messagelist';

describe('MessageList', () => {
  function message() {
    return {
      id: 1,
      messageDate: new Date('2026-06-09T12:00:00Z'),
      seenFlag: false,
      answeredFlag: false,
      flaggedFlag: false,
      from: [new MailAddressInfo('Sender Name', 'sender@example.com')],
      to: [new MailAddressInfo('Recipient Name', 'recipient@example.com')],
      subject: 'Folder switch',
      plaintext: 'Body',
      size: 1024,
      attachment: false
    };
  }

  function fromColumn(messageList: MessageList, selectedFolder: string) {
    return messageList.getCanvasTableColumns({ selectedFolder }).find(column => column.cacheKey === 'from');
  }

  it('keeps showing From for inbox rows while the selected folder changes to Sent', () => {
    const messageList = new MessageList([message()], 'Inbox');
    const column = fromColumn(messageList, 'Sent');

    expect(column.name).toBe('From');
    expect(column.getValue(0)).toBe('Sender Name');
  });

  it('keeps showing To for sent rows while the selected folder changes away from Sent', () => {
    const messageList = new MessageList([message()], 'Sent');
    const column = fromColumn(messageList, 'Inbox');

    expect(column.name).toBe('To');
    expect(column.getValue(0)).toBe('Recipient Name');
  });
});
