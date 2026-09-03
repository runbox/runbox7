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
// Runbox 7 is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
// General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Runbox 7. If not, see <https://www.gnu.org/licenses/>.
// ---------- END RUNBOX LICENSE ----------

import { fakeAsync, tick } from '@angular/core/testing';
import { MatSidenav } from '@angular/material/sidenav';
import { AppComponent } from './app.component';
import { MobileQueryService } from './mobile-query.service';

describe('AppComponent navigation links', () => {
  function createComponent(matches = true): { component: AppComponent, close: jasmine.Spy } {
    const component = Object.create(AppComponent.prototype) as AppComponent;
    const close = jasmine.createSpy('close');

    component.mobileQuery = { matches } as unknown as MobileQueryService;
    component.sidemenu = { opened: true, close } as unknown as MatSidenav;

    return { component, close };
  }

  it('closes the mobile side menu after an app-handled navigation click', fakeAsync(() => {
    const { component, close } = createComponent();

    component.closeSideMenuAfterLocalNavigation(new MouseEvent('click'));
    tick();

    expect(close).toHaveBeenCalled();
  }));

  it('does not close the current tab side menu for browser-handled link clicks', fakeAsync(() => {
    const browserHandledClicks = [
      new MouseEvent('click', { button: 1 }),
      new MouseEvent('click', { ctrlKey: true }),
      new MouseEvent('click', { metaKey: true }),
      new MouseEvent('click', { shiftKey: true }),
      new MouseEvent('click', { altKey: true }),
    ];

    for (const event of browserHandledClicks) {
      const { component, close } = createComponent();

      component.closeSideMenuAfterLocalNavigation(event);
      tick();

      expect(close).not.toHaveBeenCalled();
    }
  }));

  it('leaves the side menu open on desktop navigation clicks', fakeAsync(() => {
    const { component, close } = createComponent(false);

    component.closeSideMenuAfterLocalNavigation(new MouseEvent('click'));
    tick();

    expect(close).not.toHaveBeenCalled();
  }));
});
