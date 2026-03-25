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
  it('should auto-dismiss the toggling flags notification', () => {
    const component = Object.create(AppComponent.prototype) as AppComponent;
    const selectedMessageIds = [42];
    const snackBar = {
      open: jasmine.createSpy('open')
    };
    const updateMessages = jasmine.createSpy('updateMessages').and.callFake((args) => {
      args.updateLocal(selectedMessageIds);
    });
    const flagChangeSubject = {
      next: jasmine.createSpy('next')
    };

    component.snackBar = snackBar as any;
    component.canvastable = {
      rows: {
        selectedMessageIds: () => selectedMessageIds
      }
    } as any;
    component.messageActionsHandler = {
      updateMessages
    } as any;
    component.rmmapi = {
      messageFlagChangeSubject: flagChangeSubject
    } as any;
    component.clearSelection = jasmine.createSpy('clearSelection');
    component.singlemailviewer = null;
    component.rmm = {
      email: {
        update: jasmine.createSpy('update')
      }
    } as any;

    component.setFlaggedStatus(true);

    expect(snackBar.open).toHaveBeenCalledWith(
      'Toggling flags...',
      undefined,
      { duration: 3000 }
    );
    expect(component.clearSelection).toHaveBeenCalled();
    expect(flagChangeSubject.next).toHaveBeenCalled();
    expect(updateMessages).toHaveBeenCalled();
  });
});
