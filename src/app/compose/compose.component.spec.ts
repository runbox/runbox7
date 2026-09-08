// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2026 Runbox Solutions AS (runbox.com).
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

import { ElementRef, NgZone } from '@angular/core';
import { fakeAsync, tick } from '@angular/core/testing';
import { UntypedFormBuilder } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { DefaultPrefGroups, PreferencesService } from '../common/preferences.service';
import { MailAddressInfo } from '../common/mailaddressinfo';
import { Identity } from '../profiles/profile.service';
import { ComposeComponent } from './compose.component';
import { DraftDeskService, DraftFormModel } from './draftdesk.service';
import { RecipientsService } from './recipients.service';

describe('ComposeComponent reply writing space', () => {
    let registeredListeners: jasmine.Spy;

    beforeEach(() => {
        registeredListeners = spyOn(window, 'addEventListener').and.callThrough();
    });

    afterEach(() => {
        registeredListeners.calls.allArgs().forEach(([type, listener, options]) => {
            if (type === 'dragover' || type === 'dragleave') {
                window.removeEventListener(type, listener, options);
            }
        });
    });

    function identity(signature = '', useHTML = false): Identity {
        return Identity.fromObject({
            email: 'recipient@example.com',
            from_name: 'Recipient',
            signature,
            is_signature_html: useHTML,
        });
    }

    function reply(from: Identity, useHTML = false, all = false): DraftFormModel {
        return DraftFormModel.reply({
            mid: 42,
            headers: { 'message-id': '<original@example.com>' },
            from: [{ name: 'Sender', address: 'sender@example.com' }],
            to: [{ name: 'Recipient', address: from.email }],
            cc: [{ name: 'Other recipient', address: 'other@example.com' }],
            date: new Date('2026-09-01T12:00:00Z'),
            subject: 'Reply spacing',
            rawtext: 'Original message',
            sanitized_html: '<p>Original message</p>',
        }, [from], all, useHTML);
    }

    function openCompose(model: DraftFormModel, froms: Identity[], defaultHTML = false): ComposeComponent {
        const preferences = new Map<string, string>([
            [`${DefaultPrefGroups.Global}:composeInHTMLByDefault`, String(defaultHTML)],
        ]);
        const component = new ComposeComponent(
            null, null, null,
            { fromsSubject: new BehaviorSubject(froms) } as DraftDeskService,
            null, null, new UntypedFormBuilder(), null, null,
            { recentlyUsed: new BehaviorSubject<MailAddressInfo[]>([]) } as unknown as RecipientsService,
            { preferences: new BehaviorSubject(preferences), prefGroup: 'compose' } as unknown as PreferencesService,
            new NgZone({ enableLongStackTrace: false }),
        );
        component.model = model;
        component.messageTextArea = new ElementRef(document.createElement('textarea'));
        // Exercise form changes without sending an autosave request to the mail backend.
        spyOn(component, 'submit');
        component.ngOnInit();
        tick();
        return component;
    }

    function expectHTMLWritingSpace(html: string, signatureText: string): void {
        const body = document.createElement('div');
        body.innerHTML = html;
        const content = Array.from(body.childNodes).filter(node =>
            node.nodeType !== Node.TEXT_NODE || node.textContent.trim().length > 0);

        // HTML whitespace is not a visible line break: the editor needs two leading BR elements.
        expect(content[0]?.nodeName).toBe('BR');
        expect(content[1]?.nodeName).toBe('BR');
        expect(content[2]?.textContent).toContain(signatureText);
        expect(body.textContent).toContain('Original message');
    }

    [false, true].forEach(all => {
        it(`keeps two blank lines before a plain signature in ${all ? 'reply all' : 'reply'}`, fakeAsync(() => {
            const from = identity('Regards, Recipient');
            const component = openCompose(reply(from, false, all), [from]);
            const body = component.formGroup.controls.msg_body.value as string;

            expect(body.startsWith('\n\nRegards, Recipient')).toBeTrue();
            expect(body).toContain('> Original message');
            expect(component.model.cc.length).toBe(all ? 1 : 0);
        }));
    });

    it('keeps two visible breaks before an HTML signature in an HTML reply', fakeAsync(() => {
        const from = identity('<p>Regards, Recipient</p>', true);
        const component = openCompose(reply(from, true), [from]);

        expect(component.formGroup.controls.useHTML.value).toBeTrue();
        expectHTMLWritingSpace(component.formGroup.controls.html.value, 'Regards, Recipient');
    }));

    it('keeps two visible breaks before a plain signature when replying in HTML', fakeAsync(() => {
        const from = identity('Regards, Recipient');
        const component = openCompose(reply(from, true), [from]);

        expectHTMLWritingSpace(component.formGroup.controls.html.value, 'Regards, Recipient');
    }));

    it('preserves reply writing space when the compose preference selects HTML', fakeAsync(() => {
        const from = identity('Regards, Recipient');
        const component = openCompose(reply(from), [from], true);

        expect(component.formGroup.controls.useHTML.value).toBeTrue();
        expectHTMLWritingSpace(component.formGroup.controls.html.value, 'Regards, Recipient');
    }));

    [false, true].forEach(useHTML => {
        it(`does not add more spacing to an unsigned ${useHTML ? 'HTML' : 'plain'} reply`, fakeAsync(() => {
            const from = identity();
            const model = reply(from, useHTML);
            const originalBody = useHTML ? model.html : model.msg_body;
            const component = openCompose(model, [from]);

            expect(component.formGroup.controls[useHTML ? 'html' : 'msg_body'].value).toBe(originalBody);
        }));
    });

    it('does not change signature placement in a new non-reply draft', fakeAsync(() => {
        const from = identity('Regards, Recipient');
        const draft = DraftFormModel.create(-1, from, 'sender@example.com', 'New message');
        const component = openCompose(draft, [from]);

        expect(component.formGroup.controls.msg_body.value).toBe('Regards, Recipient\n\n');
    }));

    it('retains writing space while replacing a pristine reply signature after an identity change', fakeAsync(() => {
        const from = identity('Original signature');
        const second = Identity.fromObject({
            email: 'second@example.com',
            from_name: 'Second identity',
            signature: 'Replacement signature $&',
            is_signature_html: false,
        });
        const component = openCompose(reply(from), [from, second]);

        component.formGroup.controls.from.setValue(second.nameAndAddress);
        tick(1000);
        const body = component.formGroup.controls.msg_body.value as string;

        expect(body.startsWith('\n\nReplacement signature $&')).toBeTrue();
        expect(body).not.toContain('Original signature');
        expect(body.split('Replacement signature').length - 1).toBe(1);
        expect(body).toContain('> Original message');
        tick(1000);
    }));

    it('keeps writing space when adding a signature to a pristine unsigned reply', fakeAsync(() => {
        const from = identity();
        const second = Identity.fromObject({
            email: 'second@example.com',
            from_name: 'Second identity',
            signature: 'Regards, Second identity',
            is_signature_html: false,
        });
        const component = openCompose(reply(from), [from, second]);

        component.formGroup.controls.from.setValue(second.nameAndAddress);
        tick(1000);

        expect(component.formGroup.controls.msg_body.value).toMatch(/^\n\nRegards, Second identity/);
        expect(component.formGroup.controls.msg_body.value).toContain('> Original message');
        tick(1000);
    }));
});
