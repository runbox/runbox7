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

import { MessageInfo, IndexingTools, MailAddressInfo } from './messageinfo';
import { XapianAPI } from './rmmxapianapi';

describe('MessageInfo', () => {
    it('testGetSubjectWithoutAbbreviation', () => {
        expect(MessageInfo.getSubjectWithoutAbbreviation('Re: Testing the subject')).toBe('Testing the subject');
        expect(MessageInfo.getSubjectWithoutAbbreviation('FWD: Testing the subject')).toBe('Testing the subject');
        expect(MessageInfo.getSubjectWithoutAbbreviation('Re: Fwd: Testing the subject')).toBe('Testing the subject');
        expect(MessageInfo.getSubjectWithoutAbbreviation('SV: Fwd: Test FWD: svar')).toBe('Test FWD: svar');
    });

    it('testAddMessageToIndexWithDeleteFolders', () => {
        console.log(`Testing that messages added to specified folders will be deleted`);
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
        }  as any);

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
});
