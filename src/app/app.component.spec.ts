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
import { DefaultPrefGroups } from './common/preferences.service';

interface PreferenceServiceStub {
  prefGroup: string;
  set: jasmine.Spy;
}

interface MessageListServiceStub {
  unindexedFolders: string[];
}

interface AppComponentForTest {
  dataReady: boolean;
  lastSearchText: string;
  searchText: string;
  selectedFolder: string;
  showingSearchResults: boolean;
  showingWebSocketSearchResults: boolean;
  usewebsocketsearch: boolean;
  viewmode: string;
  conversationGroupingCheckbox: boolean;
  conversationGroupingToolTip: string;
  unreadMessagesOnlyCheckbox: boolean;
  unreadOnlyToolTip: string;
  messagelist: unknown[];
  messagelistservice: MessageListServiceStub;
  preferenceService: PreferenceServiceStub;
  resetColumns: jasmine.Spy;
  setMessageDisplay: jasmine.Spy;
  updateSearch(always?: boolean, noscroll?: boolean): void;
}

function buildComponentForTest(overrides: Partial<AppComponentForTest> = {}): AppComponentForTest {
  const component = Object.create(AppComponent.prototype) as AppComponentForTest;

  Object.assign(component, {
    dataReady: true,
    lastSearchText: '',
    searchText: '',
    selectedFolder: 'Inbox',
    showingSearchResults: true,
    showingWebSocketSearchResults: false,
    usewebsocketsearch: true,
    viewmode: 'conversations',
    conversationGroupingCheckbox: true,
    conversationGroupingToolTip: 'Threaded conversation view',
    unreadMessagesOnlyCheckbox: false,
    unreadOnlyToolTip: 'Unread messages only',
    messagelist: [],
    messagelistservice: {
      unindexedFolders: []
    },
    preferenceService: {
      prefGroup: DefaultPrefGroups.Desktop,
      set: jasmine.createSpy('set')
    },
    resetColumns: jasmine.createSpy('resetColumns'),
    setMessageDisplay: jasmine.createSpy('setMessageDisplay')
  });

  Object.assign(component, overrides);

  return component;
}

describe('AppComponent message view options', () => {
  it('clears stale threaded view state when the local index is unavailable', () => {
    const component = buildComponentForTest();

    component.updateSearch(true);

    expect(component.viewmode).toBe('messages');
    expect(component.conversationGroupingCheckbox).toBeFalse();
    expect(component.preferenceService.set).toHaveBeenCalledWith(
      DefaultPrefGroups.Desktop,
      'rmm7mailViewerViewMode',
      'messages'
    );
    expect(component.setMessageDisplay).toHaveBeenCalledWith('messagelist', component.messagelist);
  });
});
