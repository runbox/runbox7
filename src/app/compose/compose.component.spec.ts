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

import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, ReplaySubject } from 'rxjs';

import { ComposeComponent } from './compose.component';
import { DraftDeskService, DraftFormModel } from './draftdesk.service';
import { Identity } from '../profiles/profile.service';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { MessageListService } from '../rmmapi/messagelist.service';
import { DialogService } from '../dialog/dialog.service';
import { RecipientsService } from './recipients.service';
import { DefaultPrefGroups, PreferencesService } from '../common/preferences.service';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { HttpClient } from '@angular/common/http';

describe('ComposeComponent', () => {
    let fixture: ComponentFixture<ComposeComponent>;
    let component: ComposeComponent;

    beforeEach(waitForAsync(() => {
        const preferences = new ReplaySubject<Map<string, string>>(1);
        preferences.next(new Map([
            [`${DefaultPrefGroups.Global}:showPopularRecipients`, 'false'],
            [`${DefaultPrefGroups.Global}:composeInHTMLByDefault`, 'false'],
        ]));

        TestBed.configureTestingModule({
            imports: [
                ReactiveFormsModule,
                NoopAnimationsModule,
            ],
            declarations: [ComposeComponent],
            providers: [
                { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
                { provide: MatSnackBar, useValue: { open: jasmine.createSpy('open') } },
                { provide: RunboxWebmailAPI, useValue: { getMessageContents: () => of({}) } },
                { provide: DraftDeskService, useValue: {
                    fromsSubject: { value: [Identity.fromObject({ email: 'from@runbox.com' })] },
                    shouldReturnToPreviousPage: false,
                    isEditing: -1,
                    composingNewDraft: null,
                } },
                { provide: MessageListService, useValue: {} },
                { provide: HttpClient, useValue: {} },
                { provide: Location, useValue: { prepareExternalUrl: (path: string) => path, back: jasmine.createSpy('back') } },
                { provide: DialogService, useValue: {} },
                { provide: RecipientsService, useValue: { recentlyUsed: of([]) } },
                { provide: PreferencesService, useValue: {
                    preferences,
                    set: jasmine.createSpy('set'),
                } },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(ComposeComponent);
        component = fixture.componentInstance;
    });

    it('focuses the message textarea when opening a plain text reply', fakeAsync(() => {
        const focusSpy = spyOn(HTMLTextAreaElement.prototype, 'focus');
        const setSelectionRangeSpy = spyOn(HTMLTextAreaElement.prototype, 'setSelectionRange');
        const replyDraft = new DraftFormModel();
        replyDraft.mid = -1;
        replyDraft.replying = true;
        replyDraft.useHTML = false;
        replyDraft.msg_body = '\n\nOn 2021-02-21, sender@example.com wrote:\n> quoted text';
        replyDraft.to = [];
        replyDraft.cc = [];
        replyDraft.bcc = [];

        component.model = replyDraft;

        fixture.detectChanges();
        tick();

        expect(focusSpy).toHaveBeenCalled();
        expect(setSelectionRangeSpy).toHaveBeenCalledWith(0, 0);
    }));
});
