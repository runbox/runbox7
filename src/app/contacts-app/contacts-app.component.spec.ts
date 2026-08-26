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
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Subject } from 'rxjs';

import { ContactsAppComponent } from './contacts-app.component';
import { ContactsService } from './contacts.service';
import { LogoutService } from '../login/logout.service';
import { MobileQueryService } from '../mobile-query.service';
import { UsageReportsService } from '../common/usage-reports.service';

describe('ContactsAppComponent', () => {
    let fixture: ComponentFixture<ContactsAppComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [
                ContactsAppComponent,
            ],
            imports: [
                CommonModule,
                MatIconTestingModule,
                NoopAnimationsModule,
                RouterTestingModule.withRoutes([]),
            ],
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: {
                        queryParams: of({}),
                    },
                },
                {
                    provide: ContactsService,
                    useValue: {
                        activities: {
                            observable: of([]),
                        },
                        contactCategories: of([]),
                        contactsSubject: of([]),
                        deleteMultiple: () => Promise.resolve(),
                        errorLog: new Subject(),
                        informationLog: new Subject(),
                        migratingContacts: 0,
                        saveDragHelpers: () => undefined,
                        showDragHelpers: false,
                    },
                },
                {
                    provide: HttpClient,
                    useValue: {
                        get: () => of(new Blob()),
                    },
                },
                {
                    provide: LogoutService,
                    useValue: {
                        logout: () => undefined,
                    },
                },
                {
                    provide: MatDialog,
                    useValue: {
                        open: () => ({
                            afterClosed: () => of(null),
                        }),
                    },
                },
                {
                    provide: MatSnackBar,
                    useValue: {
                        open: () => undefined,
                    },
                },
                {
                    provide: MobileQueryService,
                    useValue: {
                        changed: new Subject<boolean>(),
                        matches: false,
                    },
                },
                {
                    provide: UsageReportsService,
                    useValue: {
                        report: () => undefined,
                    },
                },
            ],
            schemas: [
                NO_ERRORS_SCHEMA,
            ],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(ContactsAppComponent);
    });

    it('shows a CardDAV sync guide link in the contacts menu', () => {
        fixture.detectChanges();

        const guideLink: HTMLAnchorElement = fixture.nativeElement.querySelector(
            'a.contactListButton[href="https://help.runbox.com/runbox-7-contacts/"]',
        );

        expect(guideLink).withContext('CardDAV guide link is present').not.toBeNull();
        expect(guideLink?.textContent).toContain('CardDAV Sync Guide');
    });
});
