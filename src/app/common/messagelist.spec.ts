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
  const makeMessage = (to: MailAddressInfo[], cc: MailAddressInfo[] = []) => ({
    id: 1,
    messageDate: new Date('2026-01-01T12:00:00Z'),
    from: [new MailAddressInfo('Sender', 'sender@example.com')],
    to,
    cc,
    subject: 'Subject',
    plaintext: '',
    size: 100,
    attachment: false,
    answeredFlag: false,
    flaggedFlag: false
  });

  it('adds a recipient address column when enabled for incoming folders', () => {
    const rows = new MessageList([
      makeMessage([
        new MailAddressInfo('Alias', 'alias+shopping@runbox.com')
      ], [
        new MailAddressInfo('Copy', 'copy@example.com')
      ])
    ]);

    const columns = rows.getCanvasTableColumns({
      selectedFolder: 'Inbox',
      displayRecipientColumn: true
    });
    const recipientColumn = columns.find((column) => column.cacheKey === 'recipient');

    expect(recipientColumn).toBeTruthy();
    expect(columns.findIndex((column) => column.cacheKey === 'recipient')).toBeLessThan(
      columns.findIndex((column) => column.cacheKey === 'subject')
    );
    expect(recipientColumn.getValue(0)).toBe('alias+shopping@runbox.com, copy@example.com');
  });

  it('does not add a duplicate recipient column for Sent folders', () => {
    const rows = new MessageList([
      makeMessage([new MailAddressInfo('Recipient', 'recipient@example.com')])
    ]);

    const columns = rows.getCanvasTableColumns({
      selectedFolder: 'Sent',
      displayRecipientColumn: true
    });

    expect(columns.find((column) => column.cacheKey === 'recipient')).toBeUndefined();
    expect(columns.find((column) => column.cacheKey === 'from').name).toBe('To');
  });
});
