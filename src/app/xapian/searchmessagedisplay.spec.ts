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
import { SearchIndexDocumentData, SearchService } from './searchservice';
import { SearchMessageDisplay } from './searchmessagedisplay';

interface SearchApiFake {
  clearValueRange(): void;
  getStringValue(docId: number, valueNo: number): string;
  setStringValueRange(valueNo: number, prefix: string): void;
  sortedXapianQuery(
    query: string,
    sortColumn: number,
    sortDescending: number,
    offset: number,
    limit: number,
    collapseValue: number
  ): number[][];
}

interface SearchServiceFake {
  api: SearchApiFake;
  getDocData(docId: number): SearchIndexDocumentData;
  getMessageIdFromDocId(docId: number): number;
}

const createSearchService = (): SearchService => {
  const valueRanges: string[] = [];
  const docData: Record<number, SearchIndexDocumentData> = {
    10: {
      id: 'M10',
      from: 'read@example.com',
      subject: 'Thread subject',
      recipients: [],
      textcontent: '',
      seen: true
    },
    11: {
      id: 'M11',
      from: 'unread@example.com',
      subject: 'Thread subject',
      recipients: [],
      textcontent: '',
      seen: false
    }
  };

  const api: SearchApiFake = {
    clearValueRange: (): void => {
      valueRanges.length = 0;
    },
    getStringValue: (docId: number, _valueNo: number): string => docId === 10 || docId === 11 ? 'THREAD1' : '',
    setStringValueRange: (valueNo: number, prefix: string): void => {
      valueRanges.push(`${valueNo}:${prefix}`);
    },
    sortedXapianQuery: (
      query: string,
      _sortColumn: number,
      _sortDescending: number,
      _offset: number,
      _limit: number,
      _collapseValue: number
    ): number[][] => {
      if (query === 'conversation:THREAD1..THREAD1') {
        return [[10, 1]];
      }

      if (query === 'conversation:THREAD1..THREAD1 AND NOT flag:seen') {
        return [[11, 0]];
      }

      return [];
    }
  };

  const searchService: SearchServiceFake = {
    api,
    getDocData: (docId: number): SearchIndexDocumentData => docData[docId],
    getMessageIdFromDocId: (docId: number): number => docId + 1000
  };

  return searchService as unknown as SearchService;
};

describe('SearchMessageDisplay', () => {
  it('marks a threaded row as unread when an older message in the conversation is unread', async () => {
    const display = new SearchMessageDisplay(createSearchService(), [[10]]);
    const columns = display.getCanvasTableColumns({
      displayFolderColumn: false,
      selectedFolder: 'Inbox',
      viewmode: 'conversations'
    });
    const countColumn = columns.find((column: CanvasTableColumn) => column.cacheKey === 'count');

    expect(display.getRowSeen(0)).toBeFalse();
    expect(countColumn.getValue(0)).toBe('RETRY');

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(countColumn.getValue(0)).toBe('2');
    expect(display.getRowSeen(0)).toBeTrue();
  });
});
