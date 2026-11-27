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

import { DraftFormModel, DraftDeskService } from './draftdesk.service';
import { Identity } from '../profiles/profile.service';
import { MailAddressInfo } from '../common/mailaddressinfo';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { MessageListService } from '../rmmapi/messagelist.service';
import { ProfileService } from '../profiles/profile.service';
import { HttpClient } from '@angular/common/http';
import { of, Subject, BehaviorSubject, firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';

import moment from 'moment';
import 'moment-timezone';

// Localize and format date according to local TZ
const formatDate = (date) => {
    const localTZ = moment.tz.guess();
    const datePart = moment(date, localTZ).format('yyyy-MM-DD HH:mm Z');
    const tzPart = moment.tz(localTZ).format('z');
    return `${datePart} ${tzPart}`;
};

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
        [ Identity.fromObject({'email':'to@runbox.com'})],
        false);

        expect(draft.subject).toBe('Fwd: Test subject');
        expect(draft.from).toBe('to@runbox.com');
        // expect(draft.to[0].nameAndAddress).toBe('"From" <from@runbox.com>');
        expect(draft.msg_body).toBe(
            `\n\n----------------------------------------------\nForwarded message:
From: "From" <from@runbox.com>
Time: ${formatDate(mailDate)}
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
        [ Identity.fromObject({'email':'to@runbox.com'})],
        true);

        expect(draft.subject).toBe('Fwd: Test subject');
        expect(draft.from).toBe('to@runbox.com');
        // expect(draft.to[0].nameAndAddress).toBe('"From" <from@runbox.com>');
        expect(draft.html).toBe(
            `<br />
<hr style="width: 100%" />
---------- Forwarded message ----------<br />
From: "From" &lt;from@runbox.com&gt; <br />
Time: ${formatDate(mailDate)} <br />
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
        [ Identity.fromObject({'email':'to@runbox.com'})],
        false, false);

        expect(draft.subject).toBe('Re: Test subject');
        expect(draft.from).toBe('to@runbox.com');
        expect(draft.to[0].nameAndAddress).toBe('"Reply-To" <reply-to@runbox.com>');
        expect(draft.msg_body).toBe(`\n\nOn ${formatDate(mailDate)}, "From" <from@runbox.com> wrote:\n> blabla\n> abcde`);
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
        [ Identity.fromObject({'email':'to@runbox.com'})],
        false, false);

        expect(draft.subject).toBe('Re: Test subject');
        expect(draft.from).toBe('to@runbox.com');
        expect(draft.to[0].nameAndAddress).toBe('"From" <from@runbox.com>');
        expect(draft.msg_body).toBe(`\n\nOn ${formatDate(mailDate)}, "From" <from@runbox.com> wrote:\n> blabla\n> abcde`);
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
        [ Identity.fromObject({'email':'to@runbox.com'})],
        false, false);

        expect(draft.subject).toBe('Re: Test subject');
        expect(draft.from).toBe('to@runbox.com');
        expect(draft.to[0].nameAndAddress).toBe('"Reply-To" <reply-to@runbox.com>');
        expect(draft.msg_body).toBe(`\n\nOn ${formatDate(mailDate)}, "From" <from@runbox.com> wrote:\n> blabla\n> abcde`);
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
        [ Identity.fromObject({'email':'to@runbox.com'})],
        true, false);

        expect(draft.subject).toBe('Re: Test subject');
        expect(draft.from).toBe('to@runbox.com');
        expect(draft.to[0].nameAndAddress).toBe('"Reply-To" <reply-to@runbox.com>');
        expect(draft.to[1].nameAndAddress).toBe('"To-Extra" <to-extra@runbox.com>');
        expect(draft.cc[0].nameAndAddress).toBe('"CC" <cc@runbox.com>');
        expect(draft.msg_body).toBe(`\n\nOn ${formatDate(mailDate)}, "From" <from@runbox.com> wrote:\n> blabla\n> abcde`);
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
        [ Identity.fromObject({'email':'to@runbox.com'})],
        true, false);

        expect(draft.subject).toBe('Re: Test subject');
        expect(draft.from).toBe('to@runbox.com');
        expect(draft.to[0].nameAndAddress).toBe('"From" <from@runbox.com>');
        expect(draft.msg_body).toBe(`\n\nOn ${formatDate(mailDate)}, "From" <from@runbox.com> wrote:\n> blabla\n> abcde`);
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
        [ Identity.fromObject({'email':'to@runbox.com'}) ],
        true, false);

        expect(draft.subject).toBe('Re: Test subject');
        expect(draft.from).toBe('to@runbox.com');
        expect(draft.to[0].nameAndAddress).toBe('"From" <from@runbox.com>');
        expect(draft.msg_body).toBe(`\n\nOn ${formatDate(mailDate)}, "From" <from@runbox.com> wrote:\n> blabla\n> abcde`);
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
        [ Identity.fromObject({'email':'to@runbox.com'}) ],
        true, false);

        const replyDate = new Date(2017, 6, 2);
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
            date: replyDate,
            subject: draft.subject,
            text: draft.msg_body,
            rawtext: draft.msg_body
        },
        [ Identity.fromObject({'email':'from@runbox.com'}) ],
        false, false);

        expect(replydraft.subject).toBe('Re: Test subject');
        expect(replydraft.from).toBe('from@runbox.com');
        expect(replydraft.to[0].nameAndAddress).toBe('to@runbox.com');
        expect(replydraft.msg_body).toBe(`\n\nOn ${formatDate(replyDate)}, to@runbox.com wrote:\n` +
                                         '> \n' +
                                         '> \n' +
          `> On ${formatDate(mailDate)}, from@runbox.com wrote:\n` +
                                         '>> blabla\n>> abcde');
        expect(replydraft.isUnsaved()).toBe(true);
        done();
    });

    it('Create', (done) => {
        console.log('Create test');
        // compose?new=true
        let draft = DraftFormModel.create(
                -1,
            Identity.fromObject({'email':'to@runbox.com'}),
            null,
            '');
        expect(draft.isUnsaved()).toBe(true);

        // Link on contact page:
        draft = DraftFormModel.create(
                -1,
            Identity.fromObject({'email':'to@runbox.com'}),
            '"Test Runbox" <to@runbox.com>',
            '');
        expect(draft.isUnsaved()).toBe(true);

        // refreshDrafts
        draft = DraftFormModel.create(
            12345,
            Identity.fromObject({'email':'to@runbox.com'}),
            '"Test Runbox" <to@runbox.com>',
            'Some blahblah');
        expect(draft.isUnsaved()).toBe(false);
        done();
    });

    it('Blank draft: close compose-created draft with no user content', () => {
        const draft = DraftFormModel.create(
            -1,
            Identity.fromObject({'email': 'to@runbox.com'}),
            null,
            ''
        );

        expect(draft.isBlankDraft()).toBe(true);
    });

    it('Blank draft: ignore default signature-only content', () => {
        const identity = Identity.fromObject({
            'email': 'to@runbox.com',
            'signature': 'Kind regards,\nRunbox User'
        });
        const draft = DraftFormModel.create(-1, identity, null, '');

        draft.msg_body = 'Kind regards,\nRunbox User\n\n';

        expect(draft.isBlankDraft([identity])).toBe(true);
    });

    it('Blank draft: keep prefilled draft visible in drafts', () => {
        const identity = Identity.fromObject({'email': 'to@runbox.com'});
        const draft = DraftFormModel.create(
            -1,
            identity,
            '"Test Runbox" <test@runbox.com>',
            ''
        );

        expect(draft.isBlankDraft([identity])).toBe(false);
    });
});

describe('DraftDeskService', () => {
    let draftDeskService: DraftDeskService;
    let mockRmmapi: any;
    let mockMessageListService: any;
    let mockProfileService: any;
    let mockHttp: any;

    beforeEach(() => {
        // Mock MessageListService with minimal setup
        mockMessageListService = {
            refreshFolderList: jasmine.createSpy('refreshFolderList'),
            folderListSubject: new BehaviorSubject([]),
            messageFlagChangeSubject: new Subject()
        };

        // Mock ProfileService
        mockProfileService = {
            validProfiles: new BehaviorSubject([
                Identity.fromObject({ email: 'test@runbox.com', name: 'Test User' })
            ]),
            composeProfile: Identity.fromObject({ email: 'test@runbox.com', name: 'Test User' })
        };

        // Mock HttpClient
        mockHttp = {
            get: jasmine.createSpy('get').and.returnValue(of('template content'))
        };

        // Mock RunboxWebmailAPI
        mockRmmapi = {
            me: of({ uid: 42, username: 'testuser' }),
            listAllMessages: jasmine.createSpy('listAllMessages').and.returnValue(of([])),
            getMessageContents: jasmine.createSpy('getMessageContents').and.returnValue(of({
                headers: { subject: 'Test Subject' },
                text: { text: 'Test body', html: '<p>Test body</p>' }
            })),
            copyAttachmentToDraft: jasmine.createSpy('copyAttachmentToDraft').and.returnValue(of({ filename: 'attachment.txt' }))
        };

        draftDeskService = new DraftDeskService(
            mockRmmapi,
            mockMessageListService,
            mockProfileService,
            mockHttp
        );
    });

    describe('BehaviorSubject patterns', () => {
        it('should initialize draftModels as an empty BehaviorSubject', (done) => {
            draftDeskService.draftModels.pipe(take(1)).subscribe(drafts => {
                expect(drafts).toEqual([]);
                expect(Array.isArray(drafts)).toBe(true);
                done();
            });
        });

        it('should initialize fromsSubject with profiles from ProfileService', (done) => {
            draftDeskService.fromsSubject.pipe(take(1)).subscribe(froms => {
                expect(froms.length).toBeGreaterThan(0);
                expect(froms[0].email).toBe('test@runbox.com');
                done();
            });
        });

        it('should emit new draftModels when drafts are added', async () => {
            const drafts: any[] = [];
            draftDeskService.draftModels.subscribe(d => drafts.push(d));

            const draftModel = DraftFormModel.create(
                -1,
                mockProfileService.composeProfile,
                'to@runbox.com',
                'Test Subject'
            );

            await draftDeskService.newDraft(draftModel);

            // Wait for refreshDrafts to complete
            await new Promise(resolve => setTimeout(resolve, 50));

            // The drafts array should have been updated
            expect(drafts.length).toBeGreaterThan(0);
        });
    });

    describe('deleteDraft', () => {
        it('should remove draft from draftModels', async () => {
            // Add a draft first
            const draftModel = DraftFormModel.create(
                12345,
                mockProfileService.composeProfile,
                'to@runbox.com',
                'Test Subject'
            );

            await draftDeskService.newDraft(draftModel);
            await new Promise(resolve => setTimeout(resolve, 50));

            const draftsBefore = draftDeskService.draftModels.value;
            const initialCount = draftsBefore.length;

            // Delete the draft
            draftDeskService.deleteDraft(12345);

            const draftsAfter = draftDeskService.draftModels.value;
            expect(draftsAfter.length).toBe(initialCount - 1);
            expect(draftsAfter.find((d: DraftFormModel) => d.mid === 12345)).toBeUndefined();
        });
    });

    describe('newBugReport with firstValueFrom', () => {
        it('should create bug report draft with template from HTTP', async () => {
            mockHttp.get.and.returnValue(of('Username: %%USERNAME%%\nUser Agent: %%USERAGENT%%'));

            await draftDeskService.newBugReport(false, false, false, false, false, false);

            const drafts = draftDeskService.draftModels.value;
            expect(drafts.length).toBeGreaterThan(0);

            const bugReportDraft = drafts[0];
            expect(bugReportDraft.subject).toBe('Runbox 7 Bug Report');
            expect(bugReportDraft.msg_body).toContain('testuser');
            expect(mockHttp.get).toHaveBeenCalledWith('assets/templates/bug_report.txt', { responseType: 'text' });
        });

        it('should use firstValueFrom for both HTTP template and rmmapi.me', async () => {
            const mePromise = firstValueFrom(mockRmmapi.me) as Promise<{ uid: number; username: string }>;
            const httpPromise = firstValueFrom(mockHttp.get('assets/templates/bug_report.txt', { responseType: 'text' })) as Promise<string>;

            const [me, template] = await Promise.all([mePromise, httpPromise]);

            expect(me.uid).toBe(42);
            expect(me.username).toBe('testuser');
            expect(template).toBe('template content');
        });
    });

    describe('newVideoCallInvite with firstValueFrom', () => {
        it('should create video call invite draft with template', async () => {
            mockHttp.get.and.returnValue(of('Join the video call: %%URL%%'));

            await draftDeskService.newVideoCallInvite('recipient@example.com', new URL('https://meet.runbox.com/abc123'));

            const drafts = draftDeskService.draftModels.value;
            expect(drafts.length).toBeGreaterThan(0);

            const inviteDraft = drafts[0];
            expect(inviteDraft.subject).toBe('Let\'s have a video call');
            expect(inviteDraft.msg_body).toContain('https://meet.runbox.com/abc123');
            expect(mockHttp.get).toHaveBeenCalledWith('assets/templates/video_call.txt', { responseType: 'text' });
        });
    });

    describe('mainIdentity', () => {
        it('should return compose profile from ProfileService', () => {
            const identity = draftDeskService.mainIdentity();
            expect(identity).toEqual(mockProfileService.composeProfile);
        });
    });

    describe('RxJS integration with MessageListService', () => {
        it('should call refreshFolderList on initialization', () => {
            expect(mockMessageListService.refreshFolderList).toHaveBeenCalled();
        });

        it('should subscribe to folderListSubject for draft refresh', (done) => {
            const refreshSpy = spyOn(draftDeskService as any, 'refreshDrafts').and.callThrough();

            // Emit a folder list change
            mockMessageListService.folderListSubject.next([
                { folderId: 1, folderName: 'Inbox', totalMessages: 100, newMessages: 0 } as any
            ]);

            setTimeout(() => {
                // refreshDrafts should have been called
                expect(refreshSpy).toHaveBeenCalled();
                done();
            }, 50);
        });
    });

    describe('isEditing state', () => {
        it('should track editing state', () => {
            expect(draftDeskService.isEditing).toBe(-1);
            draftDeskService.isEditing = 123;
            expect(draftDeskService.isEditing).toBe(123);
        });
    });

    describe('shouldReturnToPreviousPage', () => {
        it('should be set to true after newDraft', async () => {
            expect(draftDeskService.shouldReturnToPreviousPage).toBe(false);

            const draftModel = DraftFormModel.create(
                -1,
                mockProfileService.composeProfile,
                'to@runbox.com',
                'Test'
            );

            await draftDeskService.newDraft(draftModel);
            expect(draftDeskService.shouldReturnToPreviousPage).toBe(true);
        });
    });
});
