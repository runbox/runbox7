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
  it('sorts From rows using normalized Xapian sort text', () => {
    const sortableFromValues: { [key: number]: string } = {
      1: 'ALICE',
      2: '"BOB',
      3: '_CARL',
      4: 'CHARLIE',
      5: 'ČASLAV',
      6: 'DAVID'
    };
    const searchService = {
      api: {
        getStringValue: (docid: number, slot: number) => {
          expect(slot).toBe(0);
          return sortableFromValues[docid];
        }
      }
    };
    const rows: Array<[number]> = [[1], [2], [3], [4], [5], [6]];

    expect(SearchMessageDisplay.sortRowsByFrom(rows, searchService, false).map((row) => row[0]))
      .toEqual([1, 2, 3, 4, 5, 6]);
    expect(SearchMessageDisplay.sortRowsByFrom(rows, searchService, true).map((row) => row[0]))
      .toEqual([6, 5, 4, 3, 2, 1]);
  });

  it('keeps equal normalized From rows in their original order', () => {
    const searchService = {
      api: {
        getStringValue: (_docid: number, _slot: number) => '"BOB'
      }
    };
    const rows: Array<[number]> = [[3], [1], [2]];

    expect(SearchMessageDisplay.sortRowsByFrom(rows, searchService, false)).toEqual(rows);
    expect(SearchMessageDisplay.sortRowsByFrom(rows, searchService, true)).toEqual(rows);
  });
});
