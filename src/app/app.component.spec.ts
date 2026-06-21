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

describe('AppComponent.filterMessageDisplay', () => {
  it('reapplies filters even when the current result set is empty', () => {
    const filterBy = jasmine.createSpy('filterBy');
    const component = {
      canvastable: {
        rows: {
          rowCount: () => 0,
          filterBy
        },
        hasChanges: false
      },
      unreadMessagesOnlyCheckbox: false,
      searchText: ''
    } as unknown as AppComponent;

    AppComponent.prototype.filterMessageDisplay.call(component);

    expect(filterBy).toHaveBeenCalled();
    expect(component.canvastable.hasChanges).toBeTrue();
  });
});
