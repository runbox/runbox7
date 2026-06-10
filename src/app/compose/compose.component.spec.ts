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
import { UntypedFormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject, of, Subject } from 'rxjs';

import { MailAddressInfo } from '../common/mailaddressinfo';
import { DialogService } from '../dialog/dialog.service';
import { MessageListService } from '../rmmapi/messagelist.service';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { Identity } from '../profiles/profile.service';
import { PreferencesService } from '../common/preferences.service';
import { RecipientsService } from './recipients.service';
import { ComposeComponent } from './compose.component';
import { DraftDeskService, DraftFormModel } from './draftdesk.service';

describe('ComposeComponent submit', () => {
    const identity = Identity.fromObject({
        email: 'sender@example.com',
        from_name: 'Sender',
        id: 7,
        folder: 'sent',
    });

    const createComponent = (draftSaveResponse = of({ mid: 12 })) => {
        const formBuilder = new UntypedFormBuilder();
        const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
        const snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
        const rmmapi = {
            me: of({ username: 'tester' }),
            saveDraft: jasmine.createSpy('saveDraft').and.returnValue(of(['1', 'Message sent', '12'])),
            deleteCachedMessageContents: jasmine.createSpy('deleteCachedMessageContents'),
        };
        const draftDeskservice = {
            fromsSubject: new BehaviorSubject<Identity[]>([identity]),
            isEditing: -1,
            composingNewDraft: null,
            shouldReturnToPreviousPage: false,
        };
        const messageListService = jasmine.createSpyObj<MessageListService>('MessageListService', ['refreshFolderList']);
        const http = jasmine.createSpyObj('HttpClient', ['post']);
        http.post.and.returnValue(draftSaveResponse);
        const location = jasmine.createSpyObj<Location>('Location', ['back', 'prepareExternalUrl']);
        const dialogService = jasmine.createSpyObj<DialogService>('DialogService', [
            'openProgressDialog',
            'closeProgressDialog',
        ]);
        const recipientService = {
            recentlyUsed: new BehaviorSubject<MailAddressInfo[]>([]),
        };
        const preferenceService = {
            prefGroup: 'compose',
            preferences: new BehaviorSubject(new Map<string, string>()),
            set: jasmine.createSpy('set'),
        };

        const component = new ComposeComponent(
            router,
            snackBar,
            rmmapi as unknown as RunboxWebmailAPI,
            draftDeskservice as unknown as DraftDeskService,
            messageListService,
            http as any,
            formBuilder,
            location,
            dialogService,
            recipientService as unknown as RecipientsService,
            preferenceService as unknown as PreferencesService,
            {} as any,
        );

        component.model = DraftFormModel.create(
            12,
            identity,
            'recipient@example.com',
            'Queued send',
        );
        component.model.msg_body = 'Message body';
        component.formGroup = formBuilder.group(component.model);

        return {
            component,
            dialogService,
            http,
            rmmapi,
            router,
            snackBar,
        };
    };

    it('sends after the current draft save completes when Send is clicked mid-save', () => {
        const draftSave = new Subject<any>();
        const {
            component,
            dialogService,
            http,
            rmmapi,
            router,
        } = createComponent(draftSave);

        component.submit(false);
        expect(component.savingInProgress).toBeTrue();
        expect(http.post).toHaveBeenCalled();

        component.submit(true);
        expect(rmmapi.saveDraft).not.toHaveBeenCalled();

        draftSave.next({ mid: '12' });
        draftSave.complete();

        expect(rmmapi.saveDraft).toHaveBeenCalledTimes(1);
        expect(rmmapi.saveDraft.calls.mostRecent().args[1]).toBeTrue();
        expect(dialogService.openProgressDialog).toHaveBeenCalled();
        expect(dialogService.closeProgressDialog).toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['/']);
        expect(component.savingInProgress).toBeFalse();
    });

    it('does not leave savingInProgress set after invalid send recipients', () => {
        const {
            component,
            dialogService,
            rmmapi,
            snackBar,
        } = createComponent();
        component.model.to = [new MailAddressInfo(null, 'invalid-recipient')];

        component.submit(true);

        expect(component.savingInProgress).toBeFalse();
        expect(rmmapi.saveDraft).not.toHaveBeenCalled();
        expect(dialogService.openProgressDialog).not.toHaveBeenCalled();
        expect(snackBar.open).toHaveBeenCalledWith(
            'Error sending: Cannot send email: TO field contains invalid email addresses',
            'Dismiss',
        );
    });

    it('does not leave savingInProgress set after a handled send error response', () => {
        const {
            component,
            dialogService,
            rmmapi,
            snackBar,
        } = createComponent();
        rmmapi.saveDraft.and.returnValue(of(['0', 'Send failed']));

        component.submit(true);

        expect(component.savingInProgress).toBeFalse();
        expect(dialogService.openProgressDialog).toHaveBeenCalled();
        expect(dialogService.closeProgressDialog).toHaveBeenCalled();
        expect(snackBar.open).toHaveBeenCalledWith('Send failed', 'Dismiss');
    });
});
