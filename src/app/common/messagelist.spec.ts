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

import { CanvasTableColumn } from '../canvastable/canvastablecolumn';
import { MessageList } from './messagelist';
import { SearchMessageDisplay } from '../xapian/searchmessagedisplay';
import { WebSocketSearchMailList } from '../websocketsearch/websocketsearchmaillist';

describe('MessageList subject display', () => {
  const subjectColumn = (columns: CanvasTableColumn[]) =>
    columns.find(column => column.cacheKey === 'subject');

  it('shows a placeholder for unread regular messages with an empty subject', () => {
    const messageList = new MessageList([{
      id: 1,
      seenFlag: false,
      subject: '',
      from: [],
      to: [],
      messageDate: new Date(),
      plaintext: '',
      size: 0,
      attachment: false,
      answeredFlag: false,
      flaggedFlag: false
    }]);

    const column = subjectColumn(messageList.getCanvasTableColumns({ selectedFolder: 'Inbox' }));

    expect(column.getValue(0)).toBe('(No subject)');
    expect(messageList.isBoldRow(0)).toBe(true);
  });

  it('shows a placeholder for unread indexed messages with a whitespace-only subject', () => {
    const display = new SearchMessageDisplay({
      getDocData: () => ({
        seen: false,
        subject: '   ',
        recipients: [],
        from: '',
        textcontent: '',
        attachment: false,
        answered: false,
        flagged: false
      }),
      getMessageIdFromDocId: (docId: number) => docId,
      api: {
        getStringValue: () => '202401011200',
        getNumericValue: () => 0
      }
    }, [[2]]);

    const column = subjectColumn(display.getCanvasTableColumns({
      selectedFolder: 'Inbox',
      displayFolderColumn: false,
      viewmode: 'messages'
    }));

    expect(column.getValue(0)).toBe('(No subject)');
    expect(display.isBoldRow(0)).toBe(true);
  });

  it('shows a placeholder for unread websocket search messages with an empty subject', () => {
    const messageList = new WebSocketSearchMailList([{
      id: 3,
      seen: false,
      subject: '',
      dateTime: '2024-01-01 12:00:00',
      fromName: 'Sender',
      size: 0
    }]);

    const column = subjectColumn(messageList.getCanvasTableColumns({}));

    expect(column.getValue(0)).toBe('(No subject)');
    expect(messageList.isBoldRow(0)).toBe(true);
  });

  it('keeps non-empty subject text unchanged', () => {
    const messageList = new MessageList([{
      id: 4,
      seenFlag: true,
      subject: 'Actual subject',
      from: [],
      to: [],
      messageDate: new Date(),
      plaintext: '',
      size: 0,
      attachment: false,
      answeredFlag: false,
      flaggedFlag: false
    }]);

    const column = subjectColumn(messageList.getCanvasTableColumns({ selectedFolder: 'Inbox' }));

    expect(column.getValue(0)).toBe('Actual subject');
    expect(messageList.isBoldRow(0)).toBe(false);
  });
});
