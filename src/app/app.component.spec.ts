// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2020 Runbox Solutions AS (runbox.com).
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

import { fakeAsync, tick } from '@angular/core/testing';

import { AppComponent } from './app.component';
import { SavedSearch } from './saved-searches/saved-searches.service';
import { WebSocketSearchService } from './websocketsearch/websocketsearch.service';

describe('AppComponent saved search selection', () => {
  let component: AppComponent;

  const savedSearch: SavedSearch = {
    name: 'Invoices',
    query: 'from:billing@example.com',
  };

  beforeEach(() => {
    component = Object.create(AppComponent.prototype);
    component.searchText = '';
    component.selectedFolder = 'Inbox';
    component.selectedSavedSearch = null;
    component.usewebsocketsearch = false;
    component.websocketsearchservice = {
      search: jasmine.createSpy('search'),
    } as unknown as WebSocketSearchService;
    component.updateSearch = jasmine.createSpy('updateSearch') as typeof component.updateSearch;
  });

  it('should clear folder selection and keep saved search highlighted when selected', fakeAsync(() => {
    component.savedSearchSelected(savedSearch);
    tick(1);

    expect(component.selectedFolder).toBeNull();
    expect(component.selectedSavedSearch).toEqual(savedSearch);
    expect(component.searchText).toBe(savedSearch.query);
    expect(component.updateSearch).toHaveBeenCalledWith(false);
  }));

  it('should rerun a saved search even when the query text is unchanged', fakeAsync(() => {
    component.searchText = savedSearch.query;

    component.savedSearchSelected(savedSearch);
    tick(1);

    expect(component.selectedFolder).toBeNull();
    expect(component.selectedSavedSearch).toEqual(savedSearch);
    expect(component.updateSearch).toHaveBeenCalledWith(true);
  }));

  it('should clear saved search selection for manual searches', () => {
    component.selectedSavedSearch = savedSearch;

    component.searchFor('manual query');

    expect(component.selectedSavedSearch).toBeNull();
  });
});
