// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2022 Runbox Solutions AS (runbox.com).
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

import { BehaviorSubject, of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

import { DraftDeskComponent } from './draftdesk.component';
import { DraftDeskService, DraftFormModel } from './draftdesk.service';
import { Identity } from '../profiles/profile.service';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';

describe('DraftDeskComponent', () => {
    it('creates a compose draft from Web Share Target query parameters', async () => {
        const draftDeskService = {
            draftModels: new BehaviorSubject<DraftFormModel[]>([]),
            fromsSubject: new BehaviorSubject([
                Identity.fromObject({ email: 'sender@runbox.com' })
            ]),
            newSharedDraft: jasmine.createSpy('newSharedDraft').and.returnValue(Promise.resolve())
        };
        const route = {
            queryParams: of({
                'share-title': 'Shared page',
                'share-text': 'Shared text',
                'share-url': 'https://example.com/page'
            })
        };

        const component = new DraftDeskComponent(
            {} as RunboxWebmailAPI,
            {} as Router,
            route as unknown as ActivatedRoute,
            draftDeskService as unknown as DraftDeskService
        );
        component.ngOnInit();

        await Promise.resolve();

        expect(draftDeskService.newSharedDraft).toHaveBeenCalledWith(
            'Shared page',
            'Shared text',
            'https://example.com/page'
        );
    });
});
