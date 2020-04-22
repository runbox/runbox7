// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2018 Runbox Solutions AS (runbox.com).
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

import {DraftFormModel} from './draftdesk.service';
import { FromAddress } from '../rmmapi/from_address';
import { MailAddressInfo } from '../xapian/messageinfo';


describe('DraftDesk', () => {
    it('Reply', (done) => {
        console.log('Reply test');
        const mailDate = new Date(2017, 6, 1);

        const timezoneOffset: number = mailDate.getTimezoneOffset();

        const timezoneOffsetString: string = 'GMT' + (timezoneOffset <= 0 ? '+' : '-') +
            ('' + (100 + (Math.abs(timezoneOffset) / 60))).substr(1, 2) + ':' +
            ('' + (100 + (Math.abs(timezoneOffset) % 60))).substr(1, 2);

        let draft = DraftFormModel.reply({
                headers: {
                    'message-id': 'themessageid12123abcdef',
                },
                from: [
                    {address: 'test1@runbox.com', name: 'Test1'}
                ]
                ,
                to: [
                    {address: 'test2@runbox.com', name: 'Test2'}
                ],
                date: mailDate,
                subject: 'Test subject',
                text: 'blabla\nabcde',
                rawtext: 'blabla\nabcde',
                html: '<p>blabla</p><p>abcde</p>'
            }
            , [ FromAddress.fromEmailAddress('test2@runbox.com')]
        , true, false);

        expect(draft.subject).toBe('Re: Test subject');
        expect(draft.to).toBe('Test1<test1@runbox.com>');
        expect(draft.msg_body).toBe(`\n2017-07-01 00:00 ${timezoneOffsetString} Test1<test1@runbox.com>:\n> blabla\n> abcde`);
        expect(draft.isUnsaved()).toBe(true);
        expect(draft.isUnsavedUntargetedDraft()).toBe(false);
        expect(draft.isUnsavedContactDraft()).toBe(false);
        expect(draft.isUnsavedReply()).toBe(false);
        expect(draft.isReply()).toBe(true);
        draft = DraftFormModel.reply({
                headers: {
                    'message-id': 'themessageid112414',
                },
                from:
                    MailAddressInfo.parse(draft.from)

                ,
                to:
                    MailAddressInfo.parse(draft.to)
                ,
                date: new Date(2017, 6, 2),
                subject: draft.subject,
                text: draft.msg_body,
                rawtext: draft.msg_body
            }
            , [ FromAddress.fromEmailAddress('test1@runbox.com') ]
        , true, false);

        expect(draft.subject).toBe('Re: Test subject');
        expect(draft.to).toBe('test2@runbox.com');
        expect(draft.msg_body).toBe(`\n2017-07-02 00:00 ${timezoneOffsetString} test2@runbox.com:\n` +
                                    '> \n' +
                                    `> 2017-07-01 00:00 ${timezoneOffsetString} Test1<test1@runbox.com>:\n` +
                                    '>> blabla\n>> abcde');
        expect(draft.isUnsaved()).toBe(true);
        expect(draft.isUnsavedUntargetedDraft()).toBe(false);
        expect(draft.isUnsavedContactDraft()).toBe(false);
        expect(draft.isUnsavedReply()).toBe(false);
        expect(draft.isReply()).toBe(true);
        done();
    });

    it('Create', (done) => {
        console.log('Create test');
        // compose?new=true
        let draft = DraftFormModel.create(
            -1,
            'test2@runbox.com',
            null,
            '');
        expect(draft.isUnsaved()).toBe(true);
        expect(draft.isUnsavedUntargetedDraft()).toBe(true);
        expect(draft.isUnsavedContactDraft()).toBe(false);
        expect(draft.isUnsavedReply()).toBe(false);
        expect(draft.isReply()).toBe(false);

        // Link on contact page:
        draft = DraftFormModel.create(
            -1,
            'test2@runbox.com',
            '"Test Runbox" <test2@runbox.com>',
            '');
        expect(draft.isUnsaved()).toBe(true);
        expect(draft.isUnsavedUntargetedDraft()).toBe(false);
        expect(draft.isUnsavedContactDraft()).toBe(true);
        expect(draft.isUnsavedReply()).toBe(false);
        expect(draft.isReply()).toBe(false);

        // refreshDrafts
        draft = DraftFormModel.create(
            12345,
            'test2@runbox.com',
            '"Test Runbox" <test2@runbox.com>',
            'Some blahblah');
        expect(draft.isUnsaved()).toBe(false);
        expect(draft.isUnsavedUntargetedDraft()).toBe(false);
        expect(draft.isUnsavedContactDraft()).toBe(false);
        expect(draft.isUnsavedReply()).toBe(false);
        expect(draft.isReply()).toBe(false);
    });
});
