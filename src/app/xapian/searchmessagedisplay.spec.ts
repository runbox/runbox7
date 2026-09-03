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
  const makeDisplay = () => new SearchMessageDisplay({
    getDocData: () => ({
      from: 'Sender',
      subject: 'Subject',
      recipients: ['alias@runbox.com', 'alias+tag@runbox.com'],
      textcontent: '',
      attachment: false,
      answered: false,
      flagged: false
    })
  }, [[42]]);

  it('adds a recipient address column for indexed incoming results', () => {
    const columns = makeDisplay().getCanvasTableColumns({
      selectedFolder: 'Inbox',
      displayFolderColumn: false,
      displayRecipientColumn: true,
      viewmode: 'messages'
    });
    const recipientColumn = columns.find((column) => column.cacheKey === 'recipient');

    expect(recipientColumn).toBeTruthy();
    expect(columns.findIndex((column) => column.cacheKey === 'recipient')).toBeLessThan(
      columns.findIndex((column) => column.cacheKey === 'subject')
    );
    expect(recipientColumn.getValue(0)).toBe('alias@runbox.com, alias+tag@runbox.com');
  });

  it('keeps Sent folder results on the existing To column when not showing all folders', () => {
    const columns = makeDisplay().getCanvasTableColumns({
      selectedFolder: 'Sent',
      displayFolderColumn: false,
      displayRecipientColumn: true,
      viewmode: 'messages'
    });

    expect(columns.find((column) => column.cacheKey === 'recipient')).toBeUndefined();
    expect(columns.find((column) => column.cacheKey === 'from').name).toBe('To');
  });
});
