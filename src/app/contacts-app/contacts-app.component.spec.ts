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

import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, EMPTY, of, Subject } from 'rxjs';

import { UsageReportsService } from '../common/usage-reports.service';
import { MobileQueryService } from '../mobile-query.service';
import { Contact } from './contact';
import { ContactsAppComponent } from './contacts-app.component';
import { ContactsService } from './contacts.service';

describe('ContactsAppComponent', () => {
    let fixture: ComponentFixture<ContactsAppComponent>;
    let component: ContactsAppComponent;

    const contactsServiceStub = {
        activities: { observable: EMPTY },
        contactCategories: new BehaviorSubject<string[]>([]),
        contactsSubject: new BehaviorSubject<Contact[]>([]),
        errorLog: EMPTY,
        informationLog: EMPTY,
        migratingContacts: 0,
        showDragHelpers: false,
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ContactsAppComponent],
            imports: [CommonModule],
            providers: [
                { provide: ContactsService, useValue: contactsServiceStub },
                { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(null) }) } },
                { provide: HttpClient, useValue: { get: () => EMPTY } },
                { provide: MobileQueryService, useValue: { changed: new Subject<boolean>(), matches: false } },
                { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
                {
                    provide: Router,
                    useValue: {
                        events: EMPTY,
                        navigate: () => Promise.resolve(true),
                        parseUrl: () => ({ root: { children: {} } }),
                    }
                },
                { provide: MatSnackBar, useValue: { open: () => null } },
                { provide: UsageReportsService, useValue: { report: () => null } },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();

        fixture = TestBed.createComponent(ContactsAppComponent);
        component = fixture.componentInstance;
    });

    it('renders selected-contact actions in the contact list column', () => {
        component.selectedCount = 2;
        component.groups = [{ id: 'group-id', display_name: () => 'Team' } as Contact];

        fixture.detectChanges();

        const root = fixture.nativeElement as HTMLElement;
        const actionBar = root.querySelector('.contactList > .multiContactActions');

        expect(root.querySelector('#sideMenu .multiContactActions')).toBeNull();
        expect(actionBar).not.toBeNull();
        expect(actionBar.textContent).toContain('2 selected');
        expect(actionBar.querySelectorAll('button').length).toBe(2);
    });

    it('hides selected-contact actions when no contacts are selected', () => {
        component.selectedCount = 0;

        fixture.detectChanges();

        const root = fixture.nativeElement as HTMLElement;

        expect(root.querySelector('.contactList > .multiContactActions')).toBeNull();
    });
});
