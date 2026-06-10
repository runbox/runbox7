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

describe('MessageDisplay', () => {
  function messageList(): MessageList {
    return new MessageList([
      { id: 101, seenFlag: false },
      { id: 102, seenFlag: false },
      { id: 103, seenFlag: false },
    ]);
  }

  it('retains checked message selections when opening another message', () => {
    const display = messageList();

    display.rowSelected(0, 0);
    display.rowSelected(1, 0);
    display.rowSelected(2, 3);

    expect(display.selectedMessageIds()).toEqual([101, 102]);
    expect(display.isOpenedRow(2)).toBe(true);
    expect(display.hasChanges).toBe(true);
  });

  it('does not toggle a selected message off when opening it', () => {
    const display = messageList();

    display.rowSelected(0, 0);
    display.rowSelected(0, 3);

    expect(display.selectedMessageIds()).toEqual([101]);
    expect(display.isOpenedRow(0)).toBe(true);
  });

  it('keeps checkbox toggles unchanged', () => {
    const display = messageList();

    display.rowSelected(0, 0);
    display.rowSelected(0, 0);

    expect(display.selectedMessageIds()).toEqual([]);
    expect(display.anySelected()).toBe(false);
  });
});
