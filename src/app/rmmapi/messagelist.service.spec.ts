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

import { MessageListService } from './messagelist.service';
import { RunboxWebmailAPI, FolderListEntry } from './rbwebmail';

import { of, Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

describe('MessageListService', () => {
    it('Check spam and trash folder names', (done) => {
        const msglistservice = new MessageListService(
            {
                messageFlagChangeSubject: new Subject(),
                getFolderList: () => {
                    return new Observable(observer => {
                        setTimeout(() =>
                            observer.next([
                            [3692896, 0, 345, 'drafts', 'Drafts', 'Drafts', 0],
                            [3692892, 0, 12, 'inbox', 'Inbox', 'Inbox', 0],
                            [3692893, 0, 125, 'sent', 'Sent', 'Sent', 0],
                            [3693770, 0, 3, 'user', 'Subsent', 'Sent.Subsent', 1],
                            [3692894, 0, 2, 'spam', 'CustomSpamFolderName', 'CustomSpamFolderName', 0],
                            [3692895, 3, 239, 'trash', 'Trash', 'Trash', 0],
                            [3693665, 0, 6, 'user', 'EmailPrivacyTester', 'EmailPrivacyTester', 0]
                        ].map(entry => new FolderListEntry(
                            entry[0] as number,
                            entry[1] as number,
                            entry[2] as number,
                            entry[3] as string,
                            entry[4] as string,
                            entry[5] as string,
                            entry[6] as number)
                        )), 0);
                    });
                }
            } as any
        );

        expect(msglistservice.spamFolderName).toBe('Spam');
        msglistservice.folderListSubject.pipe(
            filter(folders =>
                folders && folders.length > 0)
                ).subscribe(() => {
            expect(msglistservice.spamFolderName).toBe('CustomSpamFolderName');
            done();
        });
    });
});
