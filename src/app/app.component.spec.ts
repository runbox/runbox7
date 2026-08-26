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

describe('AppComponent message action notifications', () => {
  function createComponent() {
    const component = Object.create(AppComponent.prototype) as AppComponent;
    const snackBarOpen = jasmine.createSpy('open');
    const updateMessages = jasmine.createSpy('updateMessages');
    component.snackBar = {
      open: snackBarOpen,
    } as unknown as AppComponent['snackBar'];
    component.canvastable = {
      rows: {
        selectedMessageIds: () => [42],
      },
    } as unknown as AppComponent['canvastable'];
    component.messageActionsHandler = {
      updateMessages,
    } as unknown as AppComponent['messageActionsHandler'];

    return { component, snackBarOpen, updateMessages };
  }

  it('auto-dismisses the flag toggle notification', () => {
    const { component, snackBarOpen, updateMessages } = createComponent();

    component.setFlaggedStatus(true);

    expect(snackBarOpen).toHaveBeenCalledWith(
      'Toggling flags...',
      undefined,
      { duration: 3000 },
    );
    expect(updateMessages).toHaveBeenCalled();
  });

  it('auto-dismisses the read status toggle notification', () => {
    const { component, snackBarOpen, updateMessages } = createComponent();

    component.setReadStatus(true);

    expect(snackBarOpen).toHaveBeenCalledWith(
      'Toggling read status...',
      undefined,
      { duration: 3000 },
    );
    expect(updateMessages).toHaveBeenCalled();
  });
});
