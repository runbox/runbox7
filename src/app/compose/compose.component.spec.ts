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
import { NgZone, QueryList } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { MailAddressInfo } from '../common/mailaddressinfo';
import { PreferencesService } from '../common/preferences.service';
import { DialogService } from '../dialog/dialog.service';
import { MessageListService } from '../rmmapi/messagelist.service';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { Identity } from '../profiles/profile.service';
import { ComposeComponent } from './compose.component';
import { DraftDeskService, DraftFormModel } from './draftdesk.service';
import { MailRecipientInputComponent } from './mailrecipientinput.component';
import { RecipientsService } from './recipients.service';

describe('ComposeComponent', () => {
    it('commits pending typed recipients before validating a send', () => {
        const formBuilder = new UntypedFormBuilder();
        const fromIdentity = new Identity();
        fromIdentity.email = 'sender@runbox.com';
        fromIdentity.from_name = 'Sender';
        fromIdentity.resolveNameAndAddress();

        const router = { navigate: jasmine.createSpy('navigate') } as unknown as Router;
        const snackBar = { open: jasmine.createSpy('open') } as unknown as MatSnackBar;
        const rmmapi = {
            saveDraft: jasmine.createSpy('saveDraft').and.returnValue(of(['1', 'Sent', '42'])),
            deleteCachedMessageContents: jasmine.createSpy('deleteCachedMessageContents'),
            me: of({ username: 'sender' }),
        } as unknown as RunboxWebmailAPI;
        const draftDeskService = {
            fromsSubject: new BehaviorSubject([fromIdentity]),
            isEditing: -1,
            composingNewDraft: null,
            shouldReturnToPreviousPage: false,
        } as unknown as DraftDeskService;
        const messageListService = {
            refreshFolderList: jasmine.createSpy('refreshFolderList'),
        } as unknown as MessageListService;
        const dialogService = {
            openProgressDialog: jasmine.createSpy('openProgressDialog'),
            closeProgressDialog: jasmine.createSpy('closeProgressDialog'),
        } as unknown as DialogService;
        const recipientService = { recentlyUsed: of([]) } as unknown as RecipientsService;
        const preferenceService = {
            preferences: new BehaviorSubject(new Map<string, string>()),
            prefGroup: 'compose',
        } as unknown as PreferencesService;

        const component = new ComposeComponent(
            router,
            snackBar,
            rmmapi,
            draftDeskService,
            messageListService,
            {} as HttpClient,
            formBuilder,
            {} as Location,
            dialogService,
            recipientService,
            preferenceService,
            {} as NgZone,
        );
        component.formGroup = formBuilder.group({
            from: fromIdentity.nameAndAddress,
            subject: 'Subject',
            msg_body: 'Body',
            useHTML: false,
        });
        component.model = new DraftFormModel();
        component.model.from = fromIdentity.nameAndAddress;

        const commitPendingRecipient = jasmine.createSpy('commitPendingRecipient').and.callFake((force: boolean) => {
            expect(force).toBe(true);
            component.model.to = MailAddressInfo.parse('typed@example.com');
        });
        component.recipientInputs = {
            forEach(callback: (input: MailRecipientInputComponent) => void) {
                callback({ commitPendingRecipient } as unknown as MailRecipientInputComponent);
            },
        } as QueryList<MailRecipientInputComponent>;

        component.submit(true);

        expect(commitPendingRecipient).toHaveBeenCalled();
        expect(rmmapi.saveDraft).toHaveBeenCalled();
        const sentDraft = (rmmapi.saveDraft as jasmine.Spy).calls.mostRecent().args[0] as DraftFormModel;
        expect(sentDraft.to[0].address).toBe('typed@example.com');
    });
});
