// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2020 Runbox Solutions AS (runbox.com).
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

import { HttpClient } from '@angular/common/http';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { ActivatedRoute, Event as RouterEvent, NavigationEnd, Router } from '@angular/router';
import { ReplaySubject, Subject } from 'rxjs';

import { Contact } from './contact';
import { ContactsAppComponent } from './contacts-app.component';
import { ContactsService } from './contacts.service';
import { MobileQueryService } from '../mobile-query.service';
import { UsageReportsService } from '../common/usage-reports.service';

describe('ContactsAppComponent', () => {
    let contactsPageTop: HTMLElement;
    let detailsPageTop: HTMLElement;
    let routerEvents: Subject<RouterEvent>;

    beforeEach(() => {
        contactsPageTop = document.createElement('div');
        contactsPageTop.id = 'contactsPageTop';
        document.body.appendChild(contactsPageTop);
        spyOn(contactsPageTop, 'scrollIntoView');

        detailsPageTop = document.createElement('div');
        detailsPageTop.id = 'detailsPageTop';
        document.body.appendChild(detailsPageTop);
        spyOn(detailsPageTop, 'scrollIntoView');
    });

    afterEach(() => {
        contactsPageTop.remove();
        detailsPageTop.remove();
    });

    it('keeps the contact list view when showing details on desktop', () => {
        const sut = createComponent(false);

        routerEvents.next(new NavigationEnd(1, '/contacts/contact-id', '/contacts/contact-id'));

        expect(sut.showingDetails).toBeTrue();
        expect(contactsPageTop.scrollIntoView).not.toHaveBeenCalled();
        expect(detailsPageTop.scrollIntoView).toHaveBeenCalledWith(true);
    });

    it('scrolls to the page top when showing details on mobile', () => {
        createComponent(true);

        routerEvents.next(new NavigationEnd(1, '/contacts/contact-id', '/contacts/contact-id'));

        expect(contactsPageTop.scrollIntoView).toHaveBeenCalledWith(true);
        expect(detailsPageTop.scrollIntoView).toHaveBeenCalledWith(true);
    });

    function createComponent(mobile: boolean): ContactsAppComponent {
        const contactsSubject = new ReplaySubject<Contact[]>(1);
        const contactCategories = new ReplaySubject<string[]>(1);
        contactsSubject.next([]);
        contactCategories.next([]);

        const contactsService = {
            activities: { observable: new Subject<unknown>() },
            contactCategories,
            contactsSubject,
            errorLog: new Subject<unknown>(),
            informationLog: new Subject<string>(),
        } as unknown as ContactsService;

        routerEvents = new Subject<RouterEvent>();
        const router = {
            events: routerEvents,
            navigate: jasmine.createSpy('navigate'),
            parseUrl: () => ({
                root: {
                    children: {
                        primary: {
                            segments: [
                                { path: 'contacts' },
                                { path: 'contact-id' }
                            ]
                        }
                    }
                }
            }),
            url: '/contacts/contact-id',
        } as unknown as Router;

        const mobileQuery = {
            changed: new Subject<boolean>(),
            matches: mobile,
        } as unknown as MobileQueryService;

        return new ContactsAppComponent(
            contactsService,
            {} as unknown as MatDialog,
            {} as unknown as HttpClient,
            mobileQuery,
            { queryParams: new Subject<Record<string, string>>() } as unknown as ActivatedRoute,
            router,
            { open: jasmine.createSpy('open') } as unknown as MatSnackBar,
            { report: jasmine.createSpy('report') } as unknown as UsageReportsService,
        );
    }
});
