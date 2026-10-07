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

describe('AppComponent URL fragments', () => {
  function createComponent(rowFolder = 'Archive') {
    const component = Object.create(AppComponent.prototype) as AppComponent;
    const router = {
      url: '/',
      navigate: jasmine.createSpy('navigate')
    };
    const rows = {
      hasChanges: true,
      rowSelected: jasmine.createSpy('rowSelected'),
      anySelected: jasmine.createSpy('anySelected').and.returnValue(false),
      getRowMessageId: jasmine.createSpy('getRowMessageId').and.returnValue(42),
      getRowFolder: jasmine.createSpy('getRowFolder').and.returnValue(rowFolder)
    };

    Reflect.set(component, 'router', router);
    component.selectedFolder = 'Inbox';
    component.fragment = 'Inbox';
    component.viewmode = 'messages';
    component.messageSubjectDragTipShown = true;
    component.mobileQuery = { matches: false } as AppComponent['mobileQuery'];
    component.messagelistservice = {
      templateFolderName: 'Templates'
    } as AppComponent['messagelistservice'];
    component.canvastable = {
      rows,
      hasChanges: false
    } as unknown as AppComponent['canvastable'];
    component.singlemailviewer = {
      messageId: null
    } as AppComponent['singlemailviewer'];

    return { component, router, rows };
  }

  it('uses the row folder when a search result updates the URL fragment', () => {
    const { component, router } = createComponent('Archive');

    component.rowSelected(0, 1, false);

    expect(router.navigate).toHaveBeenCalledOnceWith(['/'], { fragment: 'Archive:42' });
    expect(component.fragment).toBe('Archive:42');
    expect(component.singlemailviewer.messageId).toBe(42);
  });

  it('falls back to the selected folder for rows without folder metadata', () => {
    const { component, router } = createComponent(null);

    component.rowSelected(0, 1, false);

    expect(router.navigate).toHaveBeenCalledOnceWith(['/'], { fragment: 'Inbox:42' });
    expect(component.fragment).toBe('Inbox:42');
  });
});
