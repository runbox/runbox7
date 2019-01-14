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

import { FolderListComponent } from './folderlist.component';
import { MessageListService } from '../rmmapi/messagelist.service';
import { RunboxWebmailAPI, FolderCountEntry } from '../rmmapi/rbwebmail';
import { BehaviorSubject } from 'rxjs';
import { async, tick, TestBed, getTestBed } from '@angular/core/testing';
import { MessageInfo } from '../xapian/messageinfo';
import { last, take } from 'rxjs/operators';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatSnackBarModule, MatDialogModule } from '@angular/material';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
describe('FolderListComponent', () => {
    let injector: TestBed;
    let service: RunboxWebmailAPI;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
        imports: [
                HttpClientTestingModule,
                MatSnackBarModule,
                MatDialogModule,
                NoopAnimationsModule
            ],
        providers: [RunboxWebmailAPI]
        });
        injector = getTestBed();
        service = injector.get(RunboxWebmailAPI);
        httpMock = injector.get(HttpTestingController);
    });
    it('should empty trash', async(async () => {
        let selectedFolderName: string;
        const messagesInViewSubject = new BehaviorSubject<MessageInfo[]>([]);
        const messagesToDelete = new Array(100).fill(null).map((val, ndx) =>
            new MessageInfo((ndx + 1), new Date(), new Date(), 'Realtrash', false, false, false,
                [], [], [], [], `subject ${ndx}`, `plaintext ${ndx}`, 20, false)
        );
        expect(messagesToDelete[50].id).toBe(51);

        let refreshFolderCountCalled = false;

        const comp = new FolderListComponent(
            {
                folderCountSubject: new BehaviorSubject([
                    new FolderCountEntry(1,
                        50, 40, 'inbox', 'INNBOKS', 'Inbox', 0),
                    new FolderCountEntry(2,
                            50, 40, 'user', 'Trash', 'Trash', 0),
                    new FolderCountEntry(3,
                        50, 40, 'trash', 'Realtrash', 'Realtrash', 0)
                ]),
                messagesInViewSubject: messagesInViewSubject,
                setCurrentFolder: (folder: string) => {
                    selectedFolderName = folder;
                    if (selectedFolderName === 'Realtrash') {
                        console.log('selecting folder', selectedFolderName);
                        setTimeout(() => messagesInViewSubject.next(messagesToDelete), 0);
                    }
                },
                refreshFolderCount: () => {
                    refreshFolderCountCalled = true;
                }
            } as MessageListService,
            service,
            null
        );

        await comp.emptyTrash();

        expect(selectedFolderName).toBe('Realtrash');
        const messagesSelectedForDelete = await comp.messagelistservice.messagesInViewSubject.pipe(
                take(2),
                last()
            ).toPromise();

        expect(messagesSelectedForDelete.length).toBe(messagesToDelete.length);
        messagesSelectedForDelete.forEach(msg => {
            const req = httpMock.expectOne(`/rest/v1/email/${msg.id}`);
            expect(req.request.method).toBe('DELETE');
            req.flush(200);
        });
        expect(refreshFolderCountCalled).toBeTruthy();
    }));
});
