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

describe('AppComponent route fragments', () => {
    const createComponent = (
        url: string,
        selectedFolder = 'Inbox',
        hasChildRouterOutlet = false,
        fragment = 'Drafts'
    ): { component: AppComponent, navigate: jasmine.Spy } => {
        const navigate = jasmine.createSpy('navigate');
        const component = Object.create(AppComponent.prototype) as AppComponent;

        Object.assign(component, {
            fragment,
            hasChildRouterOutlet,
            router: { url, navigate },
            selectedFolder,
        });

        return { component, navigate };
    };

    it('updates the root mail fragment when leaving a child route for a folder', () => {
        const { component, navigate } = createComponent('/compose', 'Inbox', true, 'Drafts');

        component['updateUrlFragment']();

        expect(component.fragment).toBe('Inbox');
        expect(navigate).toHaveBeenCalledOnceWith(['/'], { fragment: 'Inbox' });
    });

    it('leaves a child route even when the selected folder fragment is already current', () => {
        const { component, navigate } = createComponent('/compose', 'Inbox', true, 'Inbox');

        component['updateUrlFragment']();

        expect(component.fragment).toBe('Inbox');
        expect(navigate).toHaveBeenCalledOnceWith(['/'], { fragment: 'Inbox' });
    });

    it('does not replace an unrelated app route with a mail folder fragment', () => {
        const { component, navigate } = createComponent('/account');

        component['updateUrlFragment']();

        expect(component.fragment).toBe('Drafts');
        expect(navigate).not.toHaveBeenCalled();
    });
});
