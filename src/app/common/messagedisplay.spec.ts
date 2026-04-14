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

import { MessageDisplay } from './messagedisplay';

describe('MessageDisplay', () => {
  class TestMessageDisplay extends MessageDisplay {
    getRowSeen(index: number): boolean {
      return !!this.rows[index].seen;
    }

    getRowId(index: number): number {
      return this.rows[index].id;
    }

    getRowMessageId(index: number): number {
      return this.rows[index].id;
    }

    filterBy(): void {
      return;
    }

    getCanvasTableColumns(): any[] {
      return [];
    }
  }

  it('closes the preview pane when clicking the opened row a second time', () => {
    const sut = new TestMessageDisplay([
      { id: 101, seen: false },
      { id: 102, seen: true },
    ]);

    sut.rowSelected(0, 1);
    expect(sut.openedRowIndex).toBe(0);
    expect(sut.hasChanges).toBeTrue();

    sut.rowSelected(0, 1);
    expect(sut.openedRowIndex).toBeNull();
    expect(sut.selectedMessageIds()).toEqual([]);
    expect(sut.hasChanges).toBeTrue();
  });
});
