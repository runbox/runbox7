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
    const mailDate = new Date(2017, 6, 1);
    const timezoneOffset: number = mailDate.getTimezoneOffset();
    const timezoneOffsetString: string = 'GMT' + (timezoneOffset <= 0 ? '+' : '-') +
        ('' + (100 + (Math.abs(timezoneOffset) / 60))).substr(1, 2) + ':' +
        ('' + (100 + (Math.abs(timezoneOffset) % 60))).substr(1, 2);

    it('Reply: Address with object, single reply', (done) => {
        console.log('Reply test: Address with object, single reply');
        // fromObj, identities, all (t/f), html (t/f)
        const draft = DraftFormModel.reply({
            headers: {
                'message-id': 'themessageid12123abcdef',
            },
            from: [
                {address: 'from@runbox.com', name: 'From'}
            ]
            ,
            to: [
                {address: 'to@runbox.com', name: 'To'}
            ],
            date: mailDate,
            subject: 'Test subject',
            text: 'blabla\nabcde',
            rawtext: 'blabla\nabcde',
            html: '<p>blabla</p><p>abcde</p>'
        },
        [ FromAddress.fromEmailAddress('to@runbox.com')],
        false, false);

        expect(draft.subject).toBe('Re: Test subject');
        expect(draft.from).toBe('to@runbox.com');
        expect(draft.to[0].nameAndAddress).toBe('"From" <from@runbox.com>');
        expect(draft.msg_body).toBe(`\n2017-07-01 00:00 ${timezoneOffsetString} "From" <from@runbox.com>:\n> blabla\n> abcde`);
        expect(draft.isUnsaved()).toBe(true);
        done();
    });
    it('Reply: Address with object, single reply-to', (done) => {
        console.log('Reply test: Address with object, single reply-to');
        // fromObj, identities, all (t/f), html (t/f)
        const draft = DraftFormModel.reply({
            headers: {
                'message-id': 'themessageid12123abcdef',
                'reply-to': {
                    'text': 'Reply-To <reply-to@runbox.com>',
                    'value': {
                        'name': 'Reply-To',
                        'address': 'reply-to@runbox.com'
                    }
                }
            },
            from: [
                {address: 'from@runbox.com', name: 'From'}
            ]
            ,
            to: [
                {address: 'to@runbox.com', name: 'To'}
            ],
            date: mailDate,
            subject: 'Test subject',
            text: 'blabla\nabcde',
            rawtext: 'blabla\nabcde',
            html: '<p>blabla</p><p>abcde</p>'
        },
        [ FromAddress.fromEmailAddress('to@runbox.com')],
        false, false);

        expect(draft.subject).toBe('Re: Test subject');
        expect(draft.from).toBe('to@runbox.com');
        expect(draft.to[0].nameAndAddress).toBe('"Reply-To" <reply-to@runbox.com>');
        expect(draft.msg_body).toBe(`\n2017-07-01 00:00 ${timezoneOffsetString} "From" <from@runbox.com>:\n> blabla\n> abcde`);
        expect(draft.isUnsaved()).toBe(true);
        done();
    });
    it('Reply: Address with object, reply to all', (done) => {
        console.log('Reply test: Address with object, reply to all');
        const draft = DraftFormModel.reply({
            headers: {
                'message-id': 'themessageid12123abcdef',
            },
            from: [
                {address: 'from@runbox.com', name: 'From'}
            ]
            ,
            to: [
                {address: 'to@runbox.com', name: 'To'}
            ],
            date: mailDate,
            subject: 'Test subject',
            text: 'blabla\nabcde',
            rawtext: 'blabla\nabcde',
            html: '<p>blabla</p><p>abcde</p>'
        },
        [ FromAddress.fromEmailAddress('to@runbox.com')],
        true, false);

        expect(draft.subject).toBe('Re: Test subject');
        expect(draft.from).toBe('to@runbox.com');
        expect(draft.to[0].nameAndAddress).toBe('"From" <from@runbox.com>');
        expect(draft.msg_body).toBe(`\n2017-07-01 00:00 ${timezoneOffsetString} "From" <from@runbox.com>:\n> blabla\n> abcde`);
        expect(draft.isUnsaved()).toBe(true);
        done();
    });
    it('Reply: Address with MAI', (done) => {
        console.log('Reply test: Address with MAI');
        const draft = DraftFormModel.reply({
            headers: {
                'message-id': 'themessageid112414',
            },
            from:
            MailAddressInfo.parse('"From" <from@runbox.com>')

            ,
            to:
            MailAddressInfo.parse('To<to@runbox.com>')
            ,
            date: mailDate,
            subject: 'Test subject',
            text: 'blabla\nabcde',
            rawtext: 'blabla\nabcde'
        },
        [ FromAddress.fromEmailAddress('to@runbox.com') ],
        true, false);

        expect(draft.subject).toBe('Re: Test subject');
        expect(draft.from).toBe('to@runbox.com');
        expect(draft.to[0].nameAndAddress).toBe('"From" <from@runbox.com>');
        expect(draft.msg_body).toBe(`\n2017-07-01 00:00 ${timezoneOffsetString} "From" <from@runbox.com>:\n> blabla\n> abcde`);
        expect(draft.isUnsaved()).toBe(true);
        done();
    });
    it('Reply: Address with MAI, reply to reply', (done) => {
        console.log('Reply test: Address with MAI, reply to reply');
        const draft = DraftFormModel.reply({
            headers: {
                'message-id': 'themessageid112414',
            },
            from:
            MailAddressInfo.parse('from@runbox.com')

            ,
            to:
            MailAddressInfo.parse('To<to@runbox.com>')
            ,
            date: mailDate,
            subject: 'Test subject',
            text: 'blabla\nabcde',
            rawtext: 'blabla\nabcde'
        },
        [ FromAddress.fromEmailAddress('to@runbox.com') ],
        true, false);

        const replydraft = DraftFormModel.reply({
            headers: {
                'message-id': 'themessageid112414',
            },
            from:
            MailAddressInfo.parse(draft.from)

            ,
            to:
            MailAddressInfo.parse(draft.to[0].nameAndAddress)
            ,
            date: new Date(2017, 6, 2),
            subject: draft.subject,
            text: draft.msg_body,
            rawtext: draft.msg_body
        },
        [ FromAddress.fromEmailAddress('from@runbox.com') ],
        false, false);

        expect(replydraft.subject).toBe('Re: Test subject');
        expect(replydraft.from).toBe('from@runbox.com');
        expect(replydraft.to[0].nameAndAddress).toBe('to@runbox.com');
        expect(replydraft.msg_body).toBe(`\n2017-07-02 00:00 ${timezoneOffsetString} to@runbox.com:\n` +
                                         '> \n' +
                                         `> 2017-07-01 00:00 ${timezoneOffsetString} from@runbox.com:\n` +
                                         '>> blabla\n>> abcde');
        expect(replydraft.isUnsaved()).toBe(true);
        done();
    });

    it('Create', (done) => {
        console.log('Create test');
        // compose?new=true
        let draft = DraftFormModel.create(
                -1,
            FromAddress.fromEmailAddress('to@runbox.com'),
            null,
            '');
        expect(draft.isUnsaved()).toBe(true);

        // Link on contact page:
        draft = DraftFormModel.create(
                -1,
            FromAddress.fromEmailAddress('to@runbox.com'),
            '"Test Runbox" <to@runbox.com>',
            '');
        expect(draft.isUnsaved()).toBe(true);

        // refreshDrafts
        draft = DraftFormModel.create(
            12345,
            FromAddress.fromEmailAddress('to@runbox.com'),
            '"Test Runbox" <to@runbox.com>',
            'Some blahblah');
        expect(draft.isUnsaved()).toBe(false);
        done();
    });
});
