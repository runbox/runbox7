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
import { ScreenSize } from './mobile-query.service';

interface PreferenceServiceStub {
    prefGroup: string;
    set: jasmine.Spy;
}

describe('AppComponent mail viewer width', () => {
    let component: AppComponent;
    let preferenceService: PreferenceServiceStub;

    beforeEach(() => {
        preferenceService = {
            prefGroup: 'Desktop',
            set: jasmine.createSpy('set')
        };
        component = Object.create(AppComponent.prototype) as AppComponent;
        component.mobileQuery = { screenSize: ScreenSize.Desktop } as AppComponent['mobileQuery'];
        (component as unknown as { preferenceService: PreferenceServiceStub }).preferenceService = preferenceService;
        component.mailViewerRightSideWidth = '40%';
    });

    it('loads the saved desktop preview-pane width from preferences', () => {
        component.applyMailViewerRightSideWidthPreference(new Map([
            ['Desktop:mailViewerRightSideWidth', '480px']
        ]));

        expect(component.mailViewerRightSideWidth).toBe('480px');
    });

    it('uses the default desktop preview-pane width when no preference exists', () => {
        component.mailViewerRightSideWidth = '240px';

        component.applyMailViewerRightSideWidthPreference(new Map());

        expect(component.mailViewerRightSideWidth).toBe('40%');
    });

    it('keeps the right preview pane full width outside desktop layout', () => {
        component.mobileQuery = { screenSize: ScreenSize.Phone } as AppComponent['mobileQuery'];

        component.applyMailViewerRightSideWidthPreference(new Map([
            ['Desktop:mailViewerRightSideWidth', '480px']
        ]));

        expect(component.mailViewerRightSideWidth).toBe('100%');
    });

    it('stores desktop resize width as a preference', () => {
        component.mailViewerRightSideResized(420);

        expect(component.mailViewerRightSideWidth).toBe('420px');
        expect(preferenceService.set).toHaveBeenCalledWith('Desktop', 'mailViewerRightSideWidth', '420px');
    });

    it('does not store resize width outside desktop layout', () => {
        component.mobileQuery = { screenSize: ScreenSize.Phone } as AppComponent['mobileQuery'];

        component.mailViewerRightSideResized(420);

        expect(preferenceService.set).not.toHaveBeenCalled();
    });
});
