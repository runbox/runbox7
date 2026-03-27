import { NgZone } from '@angular/core';
import { Location } from '@angular/common';
import { UntypedFormBuilder } from '@angular/forms';
import { of, BehaviorSubject } from 'rxjs';
import { ComposeComponent } from './compose.component';
import { DraftFormModel } from './draftdesk.service';
import { MailAddressInfo } from '../common/mailaddressinfo';

describe('ComposeComponent', () => {
    const createComponent = () => {
        const snackBar = {
            open: jasmine.createSpy('open')
        };
        const rmmapi = {
            saveDraft: jasmine.createSpy('saveDraft').and.returnValue(of(['1', 'Sent', '123'])),
            deleteCachedMessageContents: jasmine.createSpy('deleteCachedMessageContents')
        };
        const draftDeskservice = {
            fromsSubject: new BehaviorSubject([
                {
                    nameAndAddress: 'Sender <sender@example.com>',
                    email: 'sender@example.com',
                    from_name: 'Sender',
                    id: 42,
                    folder: 'Inbox',
                    reply_to: '',
                }
            ]),
            isEditing: -1,
            composingNewDraft: null,
        };
        const dialogService = {
            openProgressDialog: jasmine.createSpy('openProgressDialog'),
            closeProgressDialog: jasmine.createSpy('closeProgressDialog')
        };
        const recipientservice = {
            recentlyUsed: new BehaviorSubject([])
        };
        const preferenceService = {
            preferences: new BehaviorSubject({
                get: () => 'false'
            }),
            prefGroup: 'compose'
        };
        const component = new ComposeComponent(
            {} as any,
            snackBar as any,
            rmmapi as any,
            draftDeskservice as any,
            { refreshFolderList: jasmine.createSpy('refreshFolderList') } as any,
            { post: jasmine.createSpy('post') } as any,
            new UntypedFormBuilder(),
            {} as Location,
            dialogService as any,
            recipientservice as any,
            preferenceService as any,
            new NgZone({ enableLongStackTrace: false }),
        );

        component.model = new DraftFormModel();
        component.model.to = MailAddressInfo.parse('recipient@example.com');
        component.model.cc = [];
        component.model.bcc = [];
        component.formGroup = new UntypedFormBuilder().group({
            from: 'Sender <sender@example.com>',
            subject: '',
            msg_body: 'Body',
            useHTML: false,
        });
        spyOn(component.draftDeleted, 'emit');
        spyOn(component as any, 'exitToTable');

        return { component, rmmapi, dialogService };
    };

    it('asks for confirmation before sending a blank-subject message', () => {
        const { component, rmmapi, dialogService } = createComponent();
        spyOn(window, 'confirm').and.returnValue(false);

        component.submit(true);

        expect(window.confirm).toHaveBeenCalledWith('Send this message without a subject?');
        expect(rmmapi.saveDraft).not.toHaveBeenCalled();
        expect(dialogService.openProgressDialog).not.toHaveBeenCalled();
        expect(component.savingInProgress).toBeFalse();
    });

    it('sends after confirming a blank-subject message', () => {
        const { component, rmmapi, dialogService } = createComponent();
        spyOn(window, 'confirm').and.returnValue(true);

        component.submit(true);

        expect(window.confirm).toHaveBeenCalledWith('Send this message without a subject?');
        expect(dialogService.openProgressDialog).toHaveBeenCalled();
        expect(rmmapi.saveDraft).toHaveBeenCalled();
    });

    it('does not ask for confirmation when the subject is present', () => {
        const { component, rmmapi } = createComponent();
        component.formGroup.patchValue({ subject: 'Hello' });
        const confirmSpy = spyOn(window, 'confirm');

        component.submit(true);

        expect(confirmSpy).not.toHaveBeenCalled();
        expect(rmmapi.saveDraft).toHaveBeenCalled();
    });
});
