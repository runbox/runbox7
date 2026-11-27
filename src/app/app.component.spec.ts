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

import { fakeAsync, tick } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { AppComponent } from './app.component';

describe('AppComponent route activation', () => {
  function createComponent(currentFolder = 'Inbox'): AppComponent {
    const component = Object.create(AppComponent.prototype) as AppComponent;
    const router = { navigate: jasmine.createSpy('navigate') };

    component.hasChildRouterOutlet = true;
    component.selectedFolder = null;
    component.viewmode = 'conversations';
    component.conversationSearchText = undefined;
    Reflect.set(component, 'router', router);
    component.messagelistservice = {
      currentFolder,
      messagesInViewSubject: new BehaviorSubject([]),
      setCurrentFolder: jasmine.createSpy('setCurrentFolder'),
      unindexedFolders: [],
    } as unknown as AppComponent['messagelistservice'];
    component.canvastable = {
      scrollTop: jasmine.createSpy('scrollTop'),
    } as unknown as AppComponent['canvastable'];
    component.clearSelection = jasmine.createSpy('clearSelection');
    component.resetColumns = jasmine.createSpy('resetColumns');
    component.updateSearch = jasmine.createSpy('updateSearch');

    return component;
  }

  it('clears the selected folder when a child route opens', () => {
    const component = createComponent();
    component.selectedFolder = 'Inbox';

    component.childRouteActivated(true);

    expect(component.hasChildRouterOutlet).toBeTrue();
    expect(component.selectedFolder).toBeNull();
  });

  it('restores the current folder when returning from a child route', fakeAsync(() => {
    const component = createComponent('Archive');

    component.childRouteActivated(false);

    expect(component.hasChildRouterOutlet).toBeFalse();
    expect(component.selectedFolder).toBe('Archive');
    expect(component.messagelistservice.setCurrentFolder).toHaveBeenCalledOnceWith('Archive');
    expect(Reflect.get(component, 'router').navigate).not.toHaveBeenCalled();

    tick();

    expect(component.updateSearch).toHaveBeenCalledWith(true);
    expect(component.canvastable.scrollTop).toHaveBeenCalled();
  }));
});
