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

import { AppComponent } from './app.component';
import { MessageList } from './common/messagelist';

describe('AppComponent', () => {
  it('restores cached message rows when unread-only filtering is cleared from an empty result', () => {
    const component = Object.create(AppComponent.prototype) as AppComponent;
    const rows = new MessageList([
      { id: 1, seenFlag: true },
      { id: 2, seenFlag: true }
    ]);

    component.searchText = '';
    component.canvastable = {
      rows,
      hasChanges: false
    } as unknown as AppComponent['canvastable'];

    component.unreadMessagesOnlyCheckbox = true;
    component.filterMessageDisplay();
    expect(rows.rowCount()).toBe(0);

    component.unreadMessagesOnlyCheckbox = false;
    component.filterMessageDisplay();

    expect(rows.rowCount()).toBe(2);
    expect(component.canvastable.hasChanges).toBeTrue();
  });
});
