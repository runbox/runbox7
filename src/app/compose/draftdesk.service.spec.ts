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

import { DraftFormModel } from './draftdesk.service';
import { Identity } from '../profiles/profile.service';
import { MailAddressInfo } from '../common/mailaddressinfo';


describe('DraftDesk', () => {
    const mailDate = new Date(2017, 6, 1);

    it('Forward: froms, plain text', (done) => {
        // fromObj, identities, all (t/f), html (t/f)
        const draft = DraftFormModel.forward({
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
            attachments: [],
            date: mailDate,
            subject: 'Test subject',
            text: 'blabla\nabcde',
            rawtext: 'blabla\nabcde',
            html: '<p>blabla</p><p>abcde</p>'
        },
        [ Identity.fromEmailAddress('to@runbox.com')],
        false);

        expect(draft.subject).toBe('Fwd: Test subject');
        expect(draft.from).toBe('to@runbox.com');
        // expect(draft.to[0].nameAndAddress).toBe('"From" <from@runbox.com>');
        expect(draft.msg_body).toBe(
            `\n\n----------------------------------------------\nForwarded message:
From: "From" <from@runbox.com>
Time: 2017-07-01 00:00 +00:00 GMT
Subject: Test subject
To: "To" <to@runbox.com>


blabla\nabcde`);
        expect(draft.isUnsaved()).toBe(true);
        done();
    });
    it('Forward: froms, html text', (done) => {
        // fromObj, identities, all (t/f), html (t/f)
        const draft = DraftFormModel.forward({
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
            attachments: [],
            date: mailDate,
            subject: 'Test subject',
            text: 'blabla\nabcde',
            rawtext: 'blabla\nabcde',
            html: '<p>blabla</p><p>abcde</p>',
            sanitized_html: '<p>blabla</p><p>abcde</p>'
        },
        [ Identity.fromEmailAddress('to@runbox.com')],
        true);

        expect(draft.subject).toBe('Fwd: Test subject');
        expect(draft.from).toBe('to@runbox.com');
        // expect(draft.to[0].nameAndAddress).toBe('"From" <from@runbox.com>');
        expect(draft.html).toBe(
            `<br />
<hr style="width: 100%" />
---------- Forwarded message ----------<br />
From: "From" &lt;from@runbox.com&gt; <br />
Time: 2017-07-01 00:00 +00:00 GMT <br />
Subject: Test subject <br />
<span>To: <span>"To" &lt;to@runbox.com&gt;</span></span> <br /><br />
<p>blabla</p><p>abcde</p>`);
// <br />
// <hr style="width: 100%" />
// ---------- Forwarded message ----------<br />
// From: "From" &lt;from@runbox.com&gt; <br/>
// Time: 2017-07-01 00:00 <br/>
// Subject: Test subject <br/>
// <span>To: <span>"To" &lt;to@runbox.com&gt;</span></span> <br /><br />
// <p>blabla</p><p>abcde</p>`);
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
                    'value': [{
                        'name': 'Reply-To',
                        'address': 'reply-to@runbox.com'
                    }]
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
        [ Identity.fromEmailAddress('to@runbox.com')],
        false, false);

        expect(draft.subject).toBe('Re: Test subject');
        expect(draft.from).toBe('to@runbox.com');
        expect(draft.to[0].nameAndAddress).toBe('"Reply-To" <reply-to@runbox.com>');
        expect(draft.msg_body).toBe(`\nOn 2017-07-01 00:00 +00:00 GMT, "From" <from@runbox.com> wrote:\n> blabla\n> abcde`);
        expect(draft.isUnsaved()).toBe(true);
        done();
    });
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
        [ Identity.fromEmailAddress('to@runbox.com')],
        false, false);

        expect(draft.subject).toBe('Re: Test subject');
        expect(draft.from).toBe('to@runbox.com');
        expect(draft.to[0].nameAndAddress).toBe('"From" <from@runbox.com>');
        expect(draft.msg_body).toBe(`\nOn 2017-07-01 00:00 +00:00 GMT, "From" <from@runbox.com> wrote:\n> blabla\n> abcde`);
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
                    'value': [{
                        'name': 'Reply-To',
                        'address': 'reply-to@runbox.com'
                    }]
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
        [ Identity.fromEmailAddress('to@runbox.com')],
        false, false);

        expect(draft.subject).toBe('Re: Test subject');
        expect(draft.from).toBe('to@runbox.com');
        expect(draft.to[0].nameAndAddress).toBe('"Reply-To" <reply-to@runbox.com>');
        expect(draft.msg_body).toBe(`\nOn 2017-07-01 00:00 +00:00 GMT, "From" <from@runbox.com> wrote:\n> blabla\n> abcde`);
        expect(draft.isUnsaved()).toBe(true);
        done();
    });
    it('Reply: Address with object, reply-to all', (done) => {
        console.log('Reply test: Address with object, reply-to all');
        // fromObj, identities, all (t/f), html (t/f)
        const draft = DraftFormModel.reply({
            headers: {
                'message-id': 'themessageid12123abcdef',
                'reply-to': {
                    'text': 'Reply-To <reply-to@runbox.com>',
                    'value': [{
                        'name': 'Reply-To',
                        'address': 'reply-to@runbox.com'
                    }]
                }
            },
            from: [
                {address: 'from@runbox.com', name: 'From'}
            ]
            ,
            to: [
                {address: 'to@runbox.com', name: 'To'},
                {address: 'to-extra@runbox.com', name: 'To-Extra'}
            ],
            cc: [
                {address: 'cc@runbox.com', name: 'CC'}
            ],
            date: mailDate,
            subject: 'Test subject',
            text: 'blabla\nabcde',
            rawtext: 'blabla\nabcde',
            html: '<p>blabla</p><p>abcde</p>'
        },
        [ Identity.fromEmailAddress('to@runbox.com')],
        true, false);

        expect(draft.subject).toBe('Re: Test subject');
        expect(draft.from).toBe('to@runbox.com');
        expect(draft.to[0].nameAndAddress).toBe('"Reply-To" <reply-to@runbox.com>');
        expect(draft.to[1].nameAndAddress).toBe('"To-Extra" <to-extra@runbox.com>');
        expect(draft.cc[0].nameAndAddress).toBe('"CC" <cc@runbox.com>');
        expect(draft.msg_body).toBe(`\nOn 2017-07-01 00:00 +00:00 GMT, "From" <from@runbox.com> wrote:\n> blabla\n> abcde`);
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
        [ Identity.fromEmailAddress('to@runbox.com')],
        true, false);

        expect(draft.subject).toBe('Re: Test subject');
        expect(draft.from).toBe('to@runbox.com');
        expect(draft.to[0].nameAndAddress).toBe('"From" <from@runbox.com>');
        expect(draft.msg_body).toBe(`\nOn 2017-07-01 00:00 +00:00 GMT, "From" <from@runbox.com> wrote:\n> blabla\n> abcde`);
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
        [ Identity.fromEmailAddress('to@runbox.com') ],
        true, false);

        expect(draft.subject).toBe('Re: Test subject');
        expect(draft.from).toBe('to@runbox.com');
        expect(draft.to[0].nameAndAddress).toBe('"From" <from@runbox.com>');
        expect(draft.msg_body).toBe(`\nOn 2017-07-01 00:00 +00:00 GMT, "From" <from@runbox.com> wrote:\n> blabla\n> abcde`);
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
        [ Identity.fromEmailAddress('to@runbox.com') ],
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
        [ Identity.fromEmailAddress('from@runbox.com') ],
        false, false);

        expect(replydraft.subject).toBe('Re: Test subject');
        expect(replydraft.from).toBe('from@runbox.com');
        expect(replydraft.to[0].nameAndAddress).toBe('to@runbox.com');
        expect(replydraft.msg_body).toBe(`\nOn 2017-07-02 00:00 +00:00 GMT, to@runbox.com wrote:\n` +
                                         '> \n' +
          `> On 2017-07-01 00:00 +00:00 GMT, from@runbox.com wrote:\n` +
                                         '>> blabla\n>> abcde');
        expect(replydraft.isUnsaved()).toBe(true);
        done();
    });

    it('Create', (done) => {
        console.log('Create test');
        // compose?new=true
        let draft = DraftFormModel.create(
                -1,
            Identity.fromEmailAddress('to@runbox.com'),
            null,
            '');
        expect(draft.isUnsaved()).toBe(true);

        // Link on contact page:
        draft = DraftFormModel.create(
                -1,
            Identity.fromEmailAddress('to@runbox.com'),
            '"Test Runbox" <to@runbox.com>',
            '');
        expect(draft.isUnsaved()).toBe(true);

        // refreshDrafts
        draft = DraftFormModel.create(
            12345,
            Identity.fromEmailAddress('to@runbox.com'),
            '"Test Runbox" <to@runbox.com>',
            'Some blahblah');
        expect(draft.isUnsaved()).toBe(false);
        done();
    });
});
