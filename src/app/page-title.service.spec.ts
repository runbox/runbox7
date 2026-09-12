// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2018 Runbox Solutions AS (runbox.com).
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

import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { buildRunboxPageTitle, PageTitleService } from './page-title.service';

describe('PageTitleService', () => {
    it('builds a mail title for the root route', () => {
        expect(buildRunboxPageTitle('/')).toBe('Mail - Runbox 7');
    });

    it('builds sub-app titles from the current route', () => {
        expect(buildRunboxPageTitle('/calendar')).toBe('Calendar - Runbox 7');
        expect(buildRunboxPageTitle('/app/account/identities')).toBe('Account - Runbox 7');
        expect(buildRunboxPageTitle('/contacts/settings?foo=bar')).toBe('Contacts - Runbox 7');
    });

    it('updates the document title when navigation ends', () => {
        const events = new Subject<NavigationEnd>();
        const router = { url: '/', events } as Partial<Router> as Router;
        const title = jasmine.createSpyObj<Title>('Title', ['setTitle']);

        new PageTitleService(router, title);
        events.next(new NavigationEnd(1, '/calendar', '/calendar'));

        expect(title.setTitle).toHaveBeenCalledWith('Mail - Runbox 7');
        expect(title.setTitle).toHaveBeenCalledWith('Calendar - Runbox 7');
    });
});
