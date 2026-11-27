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

import { Location } from '@angular/common';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { UntypedFormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of, ReplaySubject } from 'rxjs';

import { PreferencesService } from '../../common/preferences.service';
import { DraftDeskService } from '../../compose/draftdesk.service';
import { MobileQueryService } from '../../mobile-query.service';
import { RunboxWebmailAPI } from '../../rmmapi/rbwebmail';
import { ContactDetailsComponent } from './contact-details.component';
import { ContactsService } from '../contacts.service';

describe('ContactDetailsComponent', () => {
    let component: ContactDetailsComponent;
    let contactsService: jasmine.SpyObj<ContactsService>;
    let router: jasmine.SpyObj<Router>;
    let snackBar: jasmine.SpyObj<MatSnackBar>;

    beforeEach(() => {
        spyOn(console, 'log');
        contactsService = {
            contactCategories: of([]),
            contactsSubject: of([]),
            lookupAvatar: jasmine.createSpy('lookupAvatar').and.returnValue(Promise.resolve(null)),
            saveContact: jasmine.createSpy('saveContact'),
        } as unknown as jasmine.SpyObj<ContactsService>;
        router = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl']);
        router.navigateByUrl.and.returnValue(Promise.resolve(true));
        snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);

        const preferences = new ReplaySubject<Map<string, unknown>>(1);
        preferences.next(new Map());

        component = new ContactDetailsComponent(
            null as unknown as MatDialog,
            { matches: false } as unknown as MobileQueryService,
            { preferences, prefGroup: 'Desktop' } as unknown as PreferencesService,
            new UntypedFormBuilder(),
            {} as unknown as RunboxWebmailAPI,
            router,
            { params: of({}), queryParams: of({}) } as unknown as ActivatedRoute,
            snackBar,
            contactsService,
            {} as unknown as DraftDeskService,
            {} as unknown as Location,
        );
    });

    it('ignores duplicate save clicks while a new contact is still saving', async () => {
        let resolveSave: (id: string) => void;
        const savePromise = new Promise<string>(resolve => {
            resolveSave = resolve;
        });
        contactsService.saveContact.and.returnValue(savePromise);

        component.loadNewContact({});
        component.contactForm.get('first_name').setValue('Ada');
        component.contactForm.get('first_name').markAsDirty();

        const pendingSave = component.save();
        component.save();

        expect(contactsService.saveContact).toHaveBeenCalledTimes(1);
        expect(component.isSaving).toBeTrue();

        resolveSave('new-contact-id');
        await pendingSave;

        expect(router.navigateByUrl).toHaveBeenCalledWith('/contacts/new-contact-id');
        expect(component.isSaving).toBeFalse();
    });

    it('allows another save after the previous save fails', async () => {
        spyOn(console, 'error');
        contactsService.saveContact.and.returnValue(Promise.reject(new Error('Save failed')));

        component.loadNewContact({});
        component.contactForm.get('first_name').setValue('Ada');
        component.contactForm.get('first_name').markAsDirty();

        await component.save();

        expect(snackBar.open).toHaveBeenCalledWith('Save failed', 'Ok');
        expect(component.isSaving).toBeFalse();

        contactsService.saveContact.and.returnValue(Promise.resolve('new-contact-id'));
        component.save();
        expect(contactsService.saveContact).toHaveBeenCalledTimes(2);
    });
});
