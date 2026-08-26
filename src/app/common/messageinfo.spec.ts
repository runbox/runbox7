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

import { MessageInfo, IndexingTools } from './messageinfo';
import { MailAddressInfo } from './mailaddressinfo';
import { XapianAPI } from '@runboxcom/runbox-searchindex/rmmxapianapi';

describe('MessageInfo', () => {
    it('testGetSubjectWithoutAbbreviation', () => {
        expect(MessageInfo.getSubjectWithoutAbbreviation('Re: Testing the subject')).toBe('Testing the subject');
        expect(MessageInfo.getSubjectWithoutAbbreviation('FWD: Testing the subject')).toBe('Testing the subject');
        expect(MessageInfo.getSubjectWithoutAbbreviation('Re: Fwd: Testing the subject')).toBe('Testing the subject');
        expect(MessageInfo.getSubjectWithoutAbbreviation('SV: Fwd: Test FWD: svar')).toBe('Test FWD: svar');
        expect(MessageInfo.getSubjectWithoutAbbreviation('')).toBe('');
        expect(MessageInfo.getSubjectWithoutAbbreviation(null)).toBe('');
    });

    it('builds a sortable text key for names with punctuation and diacritics', () => {
        const sortedNames = [
            'Alice',
            '"Bob',
            '_Carl',
            'Charlie',
            'Časlav',
            'David'
        ].sort((a, b) => MessageInfo.getSortableText(a) < MessageInfo.getSortableText(b) ? -1 : 1);

        expect(sortedNames).toEqual([
            'Alice',
            '"Bob',
            '_Carl',
            'Charlie',
            'Časlav',
            'David'
        ]);
        expect(MessageInfo.getSortableText('"Bob')).toBe('BOB');
        expect(MessageInfo.getSortableText('_Carl')).toBe('CARL');
        expect(MessageInfo.getSortableText('Časlav')).toBe('C~ASLAV');
        expect(MessageInfo.getSortableText('C~ASLAV')).toBe('C~ASLAV');
    });

    it('testAddMessageToIndexWithDeleteFolders', () => {
        console.log('Testing that messages added to specified folders will be deleted');
        const msg = new MessageInfo(1,
            new Date(),
            new Date(),
            'Spam',
            false,
            false,
            false,
            MailAddressInfo.parse('test@example.com'),
            MailAddressInfo.parse('test2@example.com'),
            [],
            [],
            'Test subject',
            'The text',
            50,
            false
            );

        let addCalled = false;
        let removeCalled = false;
        const indexingtools = new IndexingTools({
            addSortableEmailToXapianIndex: () => {
                addCalled = true;
            },

            deleteDocumentByUniqueTerm: () => {
                removeCalled = true;
            }
        } as unknown as XapianAPI);

        indexingtools.addMessageToIndex(msg);
        expect(addCalled).toBeTruthy();
        addCalled = false;
        indexingtools.addMessageToIndex(msg, ['Trash', 'Spam']);
        expect(removeCalled).toBeTruthy();
        removeCalled = false;
        msg.folder = 'Inbox';

        indexingtools.addMessageToIndex(msg, ['Trash', 'Spam']);
        expect(removeCalled).toBeFalsy();
        expect(addCalled).toBeTruthy();
    });

    it('passes normalized From sort text to the index', () => {
        const msg = new MessageInfo(3,
            new Date(),
            new Date(),
            'Inbox',
            false,
            false,
            false,
            [new MailAddressInfo('_Časlav', 'caslav@example.com')],
            MailAddressInfo.parse('test2@example.com'),
            [],
            [],
            'Test subject',
            'The text',
            50,
            false
            );

        let sortableFrom = '';
        const indexingtools = new IndexingTools({
            addSortableEmailToXapianIndex: (...args: unknown[]) => {
                sortableFrom = args[2] as string;
            },
        } as unknown as XapianAPI);

        indexingtools.addMessageToIndex(msg);
        expect(sortableFrom).toBe('C~ASLAV');
    });

    it('test AddMessageToIndex with bad dates', () => {
        const msg = new MessageInfo(2,
            new Date(),
            new Date(-1 * 3600 * 24 * 1000),
            'Inbox',
            false,
            false,
            false,
            MailAddressInfo.parse('test@example.com'),
            MailAddressInfo.parse('test2@example.com'),
            [],
            [],
            'Test bad date subject',
            'The bad date text',
            50,
            false
            );

        let addCalled = false;
        const indexingtools = new IndexingTools({
            addSortableEmailToXapianIndex: () => {
                addCalled = true;
            },
        } as unknown as XapianAPI);

        indexingtools.addMessageToIndex(msg);
        expect(addCalled).toBeTruthy();

        addCalled = false;
        // msg.messageDate = new Date(2040,1,1);
        msg.messageDate = new Date(2211667200000);
        indexingtools.addMessageToIndex(msg);
        expect(addCalled).toBeTruthy();

    });

});
