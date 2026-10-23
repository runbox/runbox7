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
import { fakeAsync, tick } from '@angular/core/testing';
import { UntypedFormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';

import { MailAddressInfo } from '../common/mailaddressinfo';
import { DialogService } from '../dialog/dialog.service';
import { MessageListService } from '../rmmapi/messagelist.service';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { Identity } from '../profiles/profile.service';
import { PreferencesService } from '../common/preferences.service';
import { RecipientsService } from './recipients.service';
import { ComposeComponent } from './compose.component';
import { DraftDeskService, DraftFormModel } from './draftdesk.service';

describe('ComposeComponent autosave after sending', () => {
    function createCompose(mid: number, sendResult: Observable<string[]>) {
        const identity = Identity.fromObject({
            email: 'sender@example.com', from_name: 'Sender', id: 7, folder: 'sent',
        });
        const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
        const rmmapi = {
            me: of({ username: 'tester' }),
            getMessageContents: jasmine.createSpy('getMessageContents').and.returnValue(of({ text: { text: 'Message body' } })),
            saveDraft: jasmine.createSpy('saveDraft').and.returnValue(sendResult),
            deleteCachedMessageContents: jasmine.createSpy('deleteCachedMessageContents'),
        };
        const http = jasmine.createSpyObj('HttpClient', ['post']);
        http.post.and.returnValue(of({ mid: 100 }));
        const draftDeskservice = {
            fromsSubject: new BehaviorSubject<Identity[]>([identity]),
            isEditing: -1,
            composingNewDraft: null,
            shouldReturnToPreviousPage: false,
        };
        const preferenceService = {
            prefGroup: 'compose',
            preferences: new BehaviorSubject(new Map<string, string>()),
        };
        const component = new ComposeComponent(
            router,
            jasmine.createSpyObj('MatSnackBar', ['open']),
            rmmapi as unknown as RunboxWebmailAPI,
            draftDeskservice as unknown as DraftDeskService,
            jasmine.createSpyObj<MessageListService>('MessageListService', ['refreshFolderList']),
            http as any,
            new UntypedFormBuilder(),
            jasmine.createSpyObj<Location>('Location', ['back', 'prepareExternalUrl']),
            jasmine.createSpyObj<DialogService>('DialogService', ['openProgressDialog', 'closeProgressDialog']),
            { recentlyUsed: new BehaviorSubject<MailAddressInfo[]>([]) } as unknown as RecipientsService,
            preferenceService as unknown as PreferencesService,
            { runOutsideAngular: (fn: () => void) => fn() } as any,
        );
        component.model = DraftFormModel.create(mid, identity, 'recipient@example.com', 'Draft');
        component.model.msg_body = 'Message body';
        component.ngOnInit();
        return { component, http, rmmapi, router };
    }

    for (const mid of [-1, 41]) {
        it(`does not recreate draft ${mid} after a successful send with a queued edit`, fakeAsync(() => {
            const { component, http, rmmapi, router } = createCompose(
                mid, of(['1', 'Message sent', '99']));

            // The form edit queues autosave before the send completes and the view is destroyed.
            component.formGroup.controls.subject.setValue('Final subject');
            component.submit(true);
            component.ngOnDestroy();
            tick(1000);

            expect(rmmapi.saveDraft).toHaveBeenCalledTimes(1);
            expect(router.navigate).toHaveBeenCalledWith(['/']);
            expect(http.post).not.toHaveBeenCalled();
        }));
    }

    it('keeps autosave available when sending fails', fakeAsync(() => {
        const { component, http, router } = createCompose(
            41, throwError(() => ({ statusText: 'Temporary failure' })));

        component.formGroup.controls.subject.setValue('Still a draft');
        component.submit(true);
        tick(1000);

        expect(router.navigate).not.toHaveBeenCalled();
        expect(http.post).toHaveBeenCalledTimes(1);
    }));
});
