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

describe('AppComponent', () => {
  function createComponent() {
    const component = Object.create(AppComponent.prototype) as AppComponent;
    const storageSet = jasmine.createSpy('storage.set');

    component.enableNotification = jasmine.createSpy('enableNotification');
    component.searchService = {
      indexDownloadingInProgress: false,
      stopIndexDownloadingInProgress: false
    } as AppComponent['searchService'];
    component.offerInitialLocalIndex = true;
    component.localSearchIndexPrompted = false;
    component.rememberLocalIndexPromptDecision = false;
    Object.assign(component, {
      storage: {
        set: storageSet
      }
    });

    return { component, storageSet };
  }

  it('does not remember a refused local index prompt unless requested', () => {
    const { component, storageSet } = createComponent();

    component.cancelOrRefuseLocalIndex();

    expect(storageSet).not.toHaveBeenCalled();
    expect(component.localSearchIndexPrompted).toBeFalse();
    expect(component.offerInitialLocalIndex).toBeFalse();
  });

  it('remembers a refused local index prompt when requested', () => {
    const { component, storageSet } = createComponent();
    component.rememberLocalIndexPromptDecision = true;

    component.cancelOrRefuseLocalIndex();

    expect(storageSet).toHaveBeenCalledOnceWith('localSearchPromptDisplayed', 'true');
    expect(component.localSearchIndexPrompted).toBeTrue();
    expect(component.offerInitialLocalIndex).toBeFalse();
  });

  it('marks an active local index download for cancellation', () => {
    const { component } = createComponent();
    component.searchService.indexDownloadingInProgress = true;

    component.cancelOrRefuseLocalIndex();

    expect(component.searchService.stopIndexDownloadingInProgress).toBeTrue();
  });
});
