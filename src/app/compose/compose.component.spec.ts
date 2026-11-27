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
import { HttpClient } from '@angular/common/http';
import { NgZone } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { PreferencesService } from '../common/preferences.service';
import { DialogService } from '../dialog/dialog.service';
import { MessageListService } from '../rmmapi/messagelist.service';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { ComposeComponent } from './compose.component';
import { DraftDeskService } from './draftdesk.service';
import { RecipientsService } from './recipients.service';

describe('ComposeComponent', () => {
    let component: ComposeComponent;
    let draftDeskService: Pick<DraftDeskService, 'shouldReturnToPreviousPage'>;
    let location: jasmine.SpyObj<Location>;
    let router: jasmine.SpyObj<Router>;

    beforeEach(() => {
        draftDeskService = {
            shouldReturnToPreviousPage: false
        };
        location = jasmine.createSpyObj<Location>('Location', ['back']);
        router = jasmine.createSpyObj<Router>('Router', ['navigate']);

        const preferenceService = {
            prefGroup: 'Desktop',
            preferences: of(new Map<string, string>()),
            set: jasmine.createSpy('set')
        } as unknown as PreferencesService;

        component = new ComposeComponent(
            router,
            {} as MatSnackBar,
            {} as RunboxWebmailAPI,
            draftDeskService as DraftDeskService,
            {} as MessageListService,
            {} as HttpClient,
            {} as UntypedFormBuilder,
            location,
            {} as DialogService,
            { recentlyUsed: of([]) } as unknown as RecipientsService,
            preferenceService,
            { run: (fn: () => void) => fn() } as NgZone
        );
    });

    it('returns to the previous mailbox after sending a new draft', () => {
        draftDeskService.shouldReturnToPreviousPage = true;

        component.exitToTable();

        expect(location.back).toHaveBeenCalled();
        expect(router.navigate).not.toHaveBeenCalled();
        expect(draftDeskService.shouldReturnToPreviousPage).toBe(false);
    });

    it('navigates to the mailbox table after sending an existing draft', () => {
        component.exitToTable();

        expect(router.navigate).toHaveBeenCalledWith(['/']);
        expect(location.back).not.toHaveBeenCalled();
    });
});
