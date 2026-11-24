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

import { SearchMessageDisplay } from './searchmessagedisplay';

describe('SearchMessageDisplay', () => {
  function searchMessageDisplay(fromEmailAddress = 'sender@example.com') {
    const searchService = {
      api: {
        getStringValue: () => '202606091200',
        getNumericValue: () => 1024
      },
      getDocData: () => ({
        id: 'Q1',
        from: 'Sender Name',
        fromEmailAddress,
        subject: 'Sender address',
        recipients: ['Recipient Name <recipient@example.com>'],
        textcontent: 'Body'
      }),
      getMessageIdFromDocId: () => 1
    };

    return new SearchMessageDisplay(searchService, [[1]]);
  }

  function columns(selectedFolder: string, showFromEmailColumn: boolean, displayFolderColumn = false) {
    return searchMessageDisplay().getCanvasTableColumns({
      selectedFolder,
      showFromEmailColumn,
      displayFolderColumn,
      viewmode: 'messages'
    });
  }

  it('adds the From Email column after From when enabled', () => {
    const tableColumns = columns('Inbox', true);
    const columnNames = tableColumns.map(column => column.name);
    const fromEmailColumn = tableColumns.find(column => column.cacheKey === 'fromEmail');

    expect(columnNames.slice(1, 5)).toEqual(['Date', 'From', 'From Email', 'Subject']);
    expect(fromEmailColumn.getValue(0)).toBe('sender@example.com');
  });

  it('falls back to the From display value when indexed sender email data is unavailable', () => {
    const tableColumns = searchMessageDisplay('').getCanvasTableColumns({
      selectedFolder: 'Inbox',
      showFromEmailColumn: true,
      displayFolderColumn: false,
      viewmode: 'messages'
    });
    const fromEmailColumn = tableColumns.find(column => column.cacheKey === 'fromEmail');

    expect(fromEmailColumn.getValue(0)).toBe('Sender Name');
  });

  it('does not add the From Email column when Sent displays To', () => {
    const tableColumns = columns('Sent', true);

    expect(tableColumns.find(column => column.cacheKey === 'fromEmail')).toBeUndefined();
    expect(tableColumns.find(column => column.cacheKey === 'from').name).toBe('To');
  });
});
