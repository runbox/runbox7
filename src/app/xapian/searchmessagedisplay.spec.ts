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

import { SearchMessageDisplay } from './searchmessagedisplay';

describe('SearchMessageDisplay', () => {
  it('uses the row folder when choosing from or to values', () => {
    const docs = {
      10: {
        folder: 'Inbox',
        from: 'Inbox Sender',
        recipients: ['Inbox Recipient'],
        subject: 'Inbox subject',
        textcontent: '',
        seen: true,
      },
      20: {
        folder: 'Sent',
        from: 'Sent Sender',
        recipients: ['Sent Recipient'],
        subject: 'Sent subject',
        textcontent: '',
        seen: true,
      },
    };
    const searchService = {
      getDocData: (id: number) => docs[id],
      getMessageIdFromDocId: (id: number) => id,
      api: {
        getStringValue: () => '202601010000',
      },
    };

    const display = new SearchMessageDisplay(searchService, [[10], [20]]);
    const sentColumns = display.getCanvasTableColumns({
      selectedFolder: 'Sent',
      displayFolderColumn: false,
      viewmode: 'list',
    });
    const fromOrToColumn = sentColumns.find(column => column.cacheKey === 'from');

    expect(fromOrToColumn.getValue(0)).toBe('Inbox Sender');
    expect(fromOrToColumn.getValue(1)).toBe('Sent Recipient');
  });
});
