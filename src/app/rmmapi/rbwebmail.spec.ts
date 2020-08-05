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

import { TestBed } from '@angular/core/testing';
import { FolderListEntry, RunboxWebmailAPI } from './rbwebmail';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

describe('RBWebMail', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                MatSnackBarModule,
                MatDialogModule,
                HttpClientTestingModule,
            ],
            providers: [RunboxWebmailAPI]
        });
    });

    it('should cache message contents', async () => {
        const rmmapi = TestBed.get(RunboxWebmailAPI);

        let messageContentsObservable = rmmapi.getMessageContents(123);

        const httpTestingController = TestBed.get(HttpTestingController);
        let req = httpTestingController.expectOne('/rest/v1/email/123');
        req.flush({
            result: {
                id: 123,
                subject: 'test'
            }
        });

        let messageContents = await messageContentsObservable.toPromise();
        expect(messageContents.id).toBe(123);
        expect(messageContents.subject).toBe('test');

        messageContentsObservable = rmmapi.getMessageContents(123);
        httpTestingController.expectNone('/rest/v1/email/123');

        messageContents = await messageContentsObservable.toPromise();
        expect(messageContents.id).toBe(123);
        expect(messageContents.subject).toBe('test');

        messageContentsObservable = rmmapi.getMessageContents(123, true);
        req = httpTestingController.expectOne('/rest/v1/email/123');
        req.flush({
            result: {
                id: 123,
                subject: 'test2'
            }
        });

        messageContents = await messageContentsObservable.toPromise();
        expect(messageContents.id).toBe(123);
        expect(messageContents.subject).toBe('test2');

        rmmapi.deleteCachedMessageContents(123);

        messageContentsObservable = rmmapi.getMessageContents(123);
        req = httpTestingController.expectOne('/rest/v1/email/123');
        req.flush({
            result: {
                id: 123,
                subject: 'test3'
            }
        });

        messageContents = await messageContentsObservable.toPromise();
        expect(messageContents.id).toBe(123);
        expect(messageContents.subject).toBe('test3');
    });

    it('should flatten folder tree structure', async () => {
        const listEmailFoldersResponse = {
            'status': 'success',
            'result': {
                'folders': [
                    {
                        'total': 4,
                        'msg_new': 0,
                        'folder': 'Funstuff',
                        'parent': null,
                        'new': 0,
                        'priority': '7',
                        'old': 4,
                        'name': 'Funstuff',
                        'id': '3693195',
                        'subfolders': [],
                        'type': 'user',
                        'size': '159190',
                        'msg_size': '159190',
                        'msg_total': 4
                    },
                    {
                        'folder': 'HTML',
                        'msg_new': 0,
                        'total': 9,
                        'id': '3693182',
                        'old': 9,
                        'priority': '1',
                        'name': 'HTML',
                        'new': 0,
                        'parent': null,
                        'type': 'user',
                        'subfolders': [
                            {
                                'msg_new': 0,
                                'folder': 'HTML.lalala',
                                'total': 26,
                                'id': '3693645',
                                'name': 'lalala',
                                'old': 26,
                                'priority': '2',
                                'new': 0,
                                'parent': 3693182,
                                'type': 'user',
                                'subfolders': [
                                    {
                                        'total': 48,
                                        'folder': 'HTML.lalala.Tester',
                                        'msg_new': 0,
                                        'new': 0,
                                        'parent': 3693645,
                                        'priority': '5',
                                        'old': 48,
                                        'name': 'Tester',
                                        'id': '3693667',
                                        'subfolders': [
                                            {
                                                'type': 'user',
                                                'subfolders': [],
                                                'msg_total': 4,
                                                'msg_size': '1806016',
                                                'size': '1806016',
                                                'folder': 'HTML.lalala.Tester.Test2',
                                                'msg_new': 0,
                                                'total': 4,
                                                'id': '3693670',
                                                'old': 4,
                                                'name': 'Test2',
                                                'priority': '6',
                                                'parent': 3693667,
                                                'new': 0
                                            }
                                        ],
                                        'type': 'user',
                                        'size': '3460523',
                                        'msg_size': '3460523',
                                        'msg_total': 48
                                    },
                                    {
                                        'msg_total': 12,
                                        'size': '85843',
                                        'msg_size': '85843',
                                        'subfolders': [
                                            {
                                                'size': '21731',
                                                'msg_size': '21731',
                                                'msg_total': 10,
                                                'subfolders': [],
                                                'type': 'user',
                                                'parent': 3693776,
                                                'new': 1,
                                                'name': 'subtest',
                                                'old': 9,
                                                'priority': '4',
                                                'id': '3693777',
                                                'total': 10,
                                                'msg_new': 1,
                                                'folder': 'HTML.lalala.hohohohahaha.subtest'
                                            }
                                        ],
                                        'type': 'user',
                                        'old': 12,
                                        'name': 'hohohohahaha',
                                        'priority': '3',
                                        'id': '3693776',
                                        'parent': 3693645,
                                        'new': 0,
                                        'total': 12,
                                        'folder': 'HTML.lalala.hohohohahaha',
                                        'msg_new': 0
                                    }
                                ],
                                'msg_total': 26,
                                'msg_size': '796443',
                                'size': '796443'
                            }
                        ],
                        'msg_total': 9,
                        'msg_size': '11188',
                        'size': '11188'
                    }
                ]
            }
        };

        const rmmapi = TestBed.get(RunboxWebmailAPI);
        const folderListPromise = rmmapi.getFolderList().toPromise();
        const httpTestingController = TestBed.get(HttpTestingController);
        const req = httpTestingController.expectOne('/rest/v1/email_folder/list');
        req.flush(listEmailFoldersResponse);

        const folders = await folderListPromise;
        expect(folders.length).toBe(7);
        expect(folders.find(
            (f: FolderListEntry) => f.folderPath === 'HTML'
        ).folderLevel).toBe(0);
        expect(folders.find(
            (f: FolderListEntry) => f.folderPath === 'HTML/lalala'
        ).folderLevel).toBe(1);
        expect(folders.find(
            (f: FolderListEntry) => f.folderPath === 'HTML/lalala/Tester'
        ).folderLevel).toBe(2);
        expect(folders.find(
            (f: FolderListEntry) => f.folderPath === 'HTML/lalala/hohohohahaha/subtest'
        ).folderLevel).toBe(3);
    });

    it('should flatten folder tree structure', async () => {
        const listEmailFoldersResponse = {
            'status': 'success',
            'result': {
                'folders': [
                    {
                        'old': 296,
                        'name': 'Drafts',
                        'priority': '0',
                        'id': '3692896',
                        'parent': null,
                        'new': 0,
                        'total': 296,
                        'folder': 'Drafts',
                        'msg_new': 0,
                        'msg_total': 296,
                        'size': '11389678',
                        'msg_size': '11389678',
                        'subfolders': [],
                        'type': 'drafts'
                    },
                    {
                        'type': 'inbox',
                        'subfolders': [],
                        'msg_total': 21,
                        'msg_size': '7024718',
                        'size': '7024718',
                        'folder': 'Inbox',
                        'msg_new': 0,
                        'total': 21,
                        'id': '3692892',
                        'priority': '0',
                        'old': 21,
                        'name': 'Inbox',
                        'new': 0,
                        'parent': null
                    },
                    {
                        'msg_total': 133,
                        'msg_size': '30479054',
                        'size': '30479054',
                        'type': 'sent',
                        'subfolders': [
                            {
                                'new': 0,
                                'parent': 3692893,
                                'id': '3693770',
                                'old': 3,
                                'name': 'Subsent',
                                'priority': '0',
                                'msg_new': 0,
                                'folder': 'Sent.Subsent',
                                'total': 3,
                                'msg_size': '2256226',
                                'size': '2256226',
                                'msg_total': 3,
                                'type': 'user',
                                'subfolders': []
                            }
                        ],
                        'id': '3692893',
                        'old': 133,
                        'priority': '0',
                        'name': 'Sent',
                        'new': 0,
                        'parent': null,
                        'folder': 'Sent',
                        'msg_new': 0,
                        'total': 133
                    },
                    {
                        'msg_new': 0,
                        'folder': 'Spam',
                        'total': 1,
                        'id': '3692894',
                        'name': 'Spam',
                        'old': 1,
                        'priority': '0',
                        'parent': null,
                        'new': 0,
                        'type': 'spam',
                        'subfolders': [],
                        'msg_total': 1,
                        'msg_size': '1157',
                        'size': '1157'
                    },
                    {
                        'id': '3692895',
                        'name': 'Trash',
                        'old': 6,
                        'priority': '0',
                        'new': 0,
                        'parent': null,
                        'msg_new': 0,
                        'folder': 'Trash',
                        'total': 6,
                        'msg_total': 6,
                        'msg_size': '135016',
                        'size': '135016',
                        'type': 'trash',
                        'subfolders': []
                    },
                    {
                        'subfolders': [],
                        'type': 'user',
                        'msg_total': 0,
                        'size': '0',
                        'msg_size': '0',
                        'total': 0,
                        'msg_new': 0,
                        'folder': 'DragAndDropMeSomewhere',
                        'name': 'DragAndDropMeSomewhere',
                        'old': 0,
                        'priority': '0',
                        'id': '3693671',
                        'parent': 0,
                        'new': 0
                    },
                    {
                        'msg_size': '1248553',
                        'size': '1248553',
                        'msg_total': 15,
                        'type': 'user',
                        'subfolders': [
                            {
                                'subfolders': [],
                                'type': 'user',
                                'msg_total': 8,
                                'size': '138665',
                                'msg_size': '138665',
                                'total': 8,
                                'folder': 'Encoding Test.EmailPrivacyTester',
                                'msg_new': 1,
                                'old': 7,
                                'name': 'EmailPrivacyTester',
                                'priority': '0',
                                'id': '3693665',
                                'new': 1,
                                'parent': 3693643
                            }
                        ],
                        'new': 0,
                        'parent': null,
                        'id': '3693643',
                        'old': 15,
                        'name': 'Encoding Test',
                        'priority': '0',
                        'msg_new': 0,
                        'folder': 'Encoding Test',
                        'total': 15
                    },
                    {
                        'total': 4,
                        'msg_new': 0,
                        'folder': 'Funstuff',
                        'parent': null,
                        'new': 0,
                        'priority': '0',
                        'old': 4,
                        'name': 'Funstuff',
                        'id': '3693195',
                        'subfolders': [],
                        'type': 'user',
                        'size': '159190',
                        'msg_size': '159190',
                        'msg_total': 4
                    },
                    {
                        'folder': 'HTML',
                        'msg_new': 0,
                        'total': 9,
                        'id': '3693182',
                        'old': 9,
                        'priority': '0',
                        'name': 'HTML',
                        'new': 0,
                        'parent': null,
                        'type': 'user',
                        'subfolders': [
                            {
                                'msg_new': 0,
                                'folder': 'HTML.lalala',
                                'total': 26,
                                'id': '3693645',
                                'name': 'lalala',
                                'old': 26,
                                'priority': '0',
                                'new': 0,
                                'parent': 3693182,
                                'type': 'user',
                                'subfolders': [
                                    {
                                        'total': 48,
                                        'folder': 'HTML.lalala.Tester',
                                        'msg_new': 0,
                                        'new': 0,
                                        'parent': 3693645,
                                        'priority': '0',
                                        'old': 48,
                                        'name': 'Tester',
                                        'id': '3693667',
                                        'subfolders': [
                                            {
                                                'type': 'user',
                                                'subfolders': [],
                                                'msg_total': 4,
                                                'msg_size': '1806016',
                                                'size': '1806016',
                                                'folder': 'HTML.lalala.Tester.Test2',
                                                'msg_new': 0,
                                                'total': 4,
                                                'id': '3693670',
                                                'old': 4,
                                                'name': 'Test2',
                                                'priority': '0',
                                                'parent': 3693667,
                                                'new': 0
                                            }
                                        ],
                                        'type': 'user',
                                        'size': '3460523',
                                        'msg_size': '3460523',
                                        'msg_total': 48
                                    },
                                    {
                                        'msg_total': 12,
                                        'size': '85843',
                                        'msg_size': '85843',
                                        'subfolders': [
                                            {
                                                'size': '21731',
                                                'msg_size': '21731',
                                                'msg_total': 10,
                                                'subfolders': [],
                                                'type': 'user',
                                                'parent': 3693776,
                                                'new': 1,
                                                'name': 'subtest',
                                                'old': 9,
                                                'priority': '0',
                                                'id': '3693777',
                                                'total': 10,
                                                'msg_new': 1,
                                                'folder': 'HTML.lalala.hohohohahaha.subtest'
                                            }
                                        ],
                                        'type': 'user',
                                        'old': 12,
                                        'name': 'hohohohahaha',
                                        'priority': '0',
                                        'id': '3693776',
                                        'parent': 3693645,
                                        'new': 0,
                                        'total': 12,
                                        'folder': 'HTML.lalala.hohohohahaha',
                                        'msg_new': 0
                                    }
                                ],
                                'msg_total': 26,
                                'msg_size': '796443',
                                'size': '796443'
                            }
                        ],
                        'msg_total': 9,
                        'msg_size': '11188',
                        'size': '11188'
                    },
                    {
                        'type': 'user',
                        'subfolders': [],
                        'msg_total': 14,
                        'msg_size': '45945',
                        'size': '45945',
                        'msg_new': 0,
                        'folder': 'Mailsploit',
                        'total': 14,
                        'id': '3693666',
                        'old': 14,
                        'priority': '0',
                        'name': 'Mailsploit',
                        'new': 0,
                        'parent': null
                    },
                    {
                        'id': '3693669',
                        'old': 7,
                        'name': 'Test',
                        'priority': '0',
                        'parent': 0,
                        'new': 0,
                        'msg_new': 0,
                        'folder': 'Test',
                        'total': 7,
                        'msg_total': 7,
                        'msg_size': '18279',
                        'size': '18279',
                        'type': 'user',
                        'subfolders': []
                    },
                    {
                        'msg_total': 7,
                        'msg_size': '17001',
                        'size': '17001',
                        'type': 'user',
                        'subfolders': [],
                        'id': '3693648',
                        'priority': '0',
                        'old': 7,
                        'name': 'popfolder',
                        'new': 0,
                        'parent': null,
                        'msg_new': 0,
                        'folder': 'popfolder',
                        'total': 7
                    },
                    {
                        'msg_size': '5748',
                        'size': '5748',
                        'msg_total': 4,
                        'type': 'user',
                        'subfolders': [],
                        'new': 1,
                        'parent': null,
                        'id': '3693649',
                        'priority': '0',
                        'old': 3,
                        'name': 'popfolder2',
                        'folder': 'popfolder2',
                        'msg_new': 1,
                        'total': 4
                    },
                    {
                        'total': 4,
                        'folder': 'testaaa',
                        'msg_new': 0,
                        'new': 0,
                        'parent': null,
                        'old': 4,
                        'name': 'testaaa',
                        'priority': '0',
                        'id': '3693632',
                        'subfolders': [],
                        'type': 'user',
                        'size': '140433',
                        'msg_size': '140433',
                        'msg_total': 4
                    },
                    {
                        'msg_size': '8457',
                        'size': '8457',
                        'msg_total': 6,
                        'type': 'user',
                        'subfolders': [],
                        'new': 0,
                        'parent': null,
                        'id': '3693623',
                        'name': 'testagain',
                        'old': 6,
                        'priority': '0',
                        'msg_new': 0,
                        'folder': 'testagain',
                        'total': 6
                    }
                ]
            }
        };

        const rmmapi = TestBed.get(RunboxWebmailAPI);
        const folderListPromise = rmmapi.getFolderList().toPromise();
        const httpTestingController = TestBed.get(HttpTestingController);
        const req = httpTestingController.expectOne('/rest/v1/email_folder/list');
        req.flush(listEmailFoldersResponse);

        const folders = await folderListPromise;
        expect(folders[0].folderId).toBe(3692896);
        expect(folders.length).toBe(22);
        expect(folders.findIndex(folder => folder.folderPath === 'HTML')).toBe(10);
        expect(folders[11].folderPath).toBe('HTML/lalala');
        expect(folders[11].folderLevel).toBe(1);
        expect(folders[12].folderPath).toBe('HTML/lalala/Tester');
        expect(folders[12].folderLevel).toBe(2);
        expect(folders[15].folderPath).toBe('HTML/lalala/hohohohahaha/subtest');
        expect(folders[15].folderLevel).toBe(3);
    });
});
