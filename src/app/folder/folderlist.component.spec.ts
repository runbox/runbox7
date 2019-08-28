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

import { FolderListComponent, DropPosition } from './folderlist.component';
import { MessageListService } from '../rmmapi/messagelist.service';
import { RunboxWebmailAPI, FolderCountEntry } from '../rmmapi/rbwebmail';
import { BehaviorSubject, of, Observable } from 'rxjs';
import { async, tick, TestBed, getTestBed } from '@angular/core/testing';
import { MessageInfo } from '../xapian/messageinfo';
import { last, take } from 'rxjs/operators';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatSnackBarModule, MatDialogModule } from '@angular/material';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DialogModule } from '../dialog/dialog.module';
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
                DialogModule,
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
    it('folderReorderingDrop', async () => {
        const comp = new FolderListComponent({
            folderCountSubject: new BehaviorSubject([
                new FolderCountEntry(1,
                    50, 40, 'inbox', 'folder1', 'folder2', 0),
                new FolderCountEntry(2,
                        50, 40, 'user', 'folder2', 'folder2', 0),
                new FolderCountEntry(3,
                    50, 40, 'user', 'subfolder', 'folder2.subfolder', 1),
                new FolderCountEntry(4,
                    50, 40, 'user', 'subsubfolder', 'folder2.subfolder.subsubfolder', 2),
                new FolderCountEntry(5,
                    50, 40, 'user', 'subsubfolder2', 'folder2.subfolder.subsubfolder2', 2),
                new FolderCountEntry(6,
                        50, 40, 'user', 'subsubfolder3', 'folder2.subfolder.subsubfolder3', 2),
                new FolderCountEntry(7,
                    50, 40, 'user', 'folder3', 'folder3', 0)
            ])
        } as MessageListService, {
            moveFolder: (folderId: number, newParentFolderId: number): Observable<boolean> => {
                return of(true);
            }
        } as RunboxWebmailAPI, null);

        console.log('move folder with id 6 above 5');
        await comp.folderReorderingDrop(6, 5, DropPosition.ABOVE);
        let rearrangedFolders = await comp.messagelistservice.folderCountSubject.pipe(take(1)).toPromise();
        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 2, 3, 4, 6, 5, 7]);
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 1, 2, 2, 2, 0]);

        console.log('move folder with id 6 above 5 - should not cause any changes');
        await comp.folderReorderingDrop(6, 5, DropPosition.ABOVE);
        rearrangedFolders = await comp.messagelistservice.folderCountSubject.pipe(take(1)).toPromise();
        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 2, 3, 4, 6, 5, 7]);
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 1, 2, 2, 2, 0]);

        console.log('move folder with id 6 below 5');
        comp.folderReorderingDrop(6, 5, DropPosition.BELOW);
        rearrangedFolders = await comp.messagelistservice.folderCountSubject.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));
        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 1, 2, 2, 2, 0]);

        console.log('move folder with id 5 below 7');
        comp.folderReorderingDrop(5, 7, DropPosition.BELOW);
        rearrangedFolders = await comp.messagelistservice.folderCountSubject.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));
        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 2, 3, 4, 6, 7, 5]);
        expect(rearrangedFolders[6].folderPath).toBe('subsubfolder2');
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 1, 2, 2, 0, 0]);

        console.log('move folder with id 5 inside 7');
        comp.folderReorderingDrop(5, 7, DropPosition.INSIDE);
        rearrangedFolders = await comp.messagelistservice.folderCountSubject.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));
        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 2, 3, 4, 6, 7, 5]);
        expect(rearrangedFolders[6].folderPath).toBe('folder3/subsubfolder2');
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 1, 2, 2, 0, 1]);

        console.log('move folder with id 7 above 1');
        comp.folderReorderingDrop(7, 1, DropPosition.ABOVE);
        rearrangedFolders = await comp.messagelistservice.folderCountSubject.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));
        expect(rearrangedFolders.map(f => f.folderId)).toEqual([7, 5, 1, 2, 3, 4, 6]);
        expect(rearrangedFolders[0].folderPath).toBe('folder3');
        expect(rearrangedFolders[1].folderPath).toBe('folder3/subsubfolder2');
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 1, 0, 0, 1, 2, 2]);

        console.log('move folder with id 7 below 1');
        comp.folderReorderingDrop(7, 1, DropPosition.BELOW);
        rearrangedFolders = await comp.messagelistservice.folderCountSubject.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));
        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 7, 5, 2, 3, 4, 6]);
        expect(rearrangedFolders[1].folderPath).toBe('folder3');
        expect(rearrangedFolders[2].folderPath).toBe('folder3/subsubfolder2');
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 1, 0, 1, 2, 2]);

        console.log('move folder with id 4 above 7');
        comp.folderReorderingDrop(4, 7, DropPosition.ABOVE);
        rearrangedFolders = await comp.messagelistservice.folderCountSubject.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));
        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 4, 7, 5, 2, 3, 6]);
        expect(rearrangedFolders[1].folderPath).toBe('subsubfolder');
        expect(rearrangedFolders[2].folderPath).toBe('folder3');
        expect(rearrangedFolders[3].folderPath).toBe('folder3/subsubfolder2');
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 0, 1, 0, 1, 2]);

        console.log('move folder with id 5 below 7');
        comp.folderReorderingDrop(5, 7, DropPosition.BELOW);
        rearrangedFolders = await comp.messagelistservice.folderCountSubject.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));
        expect(rearrangedFolders[2].folderPath).toBe('folder3');
        expect(rearrangedFolders[3].folderPath).toBe('subsubfolder2');
        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 4, 7, 5, 2, 3, 6]);
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 0, 0, 0, 1, 2]);

        console.log('move folder with id 6 below 3');
        comp.folderReorderingDrop(6, 3, DropPosition.BELOW);
        rearrangedFolders = await comp.messagelistservice.folderCountSubject.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));

        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 4, 7, 5, 2, 3, 6]);
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 0, 0, 0, 1, 1]);

        console.log('move folder with id 6 inside 7');
        comp.folderReorderingDrop(6, 7, DropPosition.INSIDE);
        rearrangedFolders = await comp.messagelistservice.folderCountSubject.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));

        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 4, 7, 6, 5, 2, 3]);
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 0, 1, 0, 0, 1]);

        console.log('move folder with id 3 above 7');
        comp.folderReorderingDrop(3, 7, DropPosition.ABOVE);
        rearrangedFolders = await comp.messagelistservice.folderCountSubject.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));

        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 4, 3, 7, 6, 5, 2]);
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 0, 0, 1, 0, 0]);

        console.log('move folder with id 6 above 4');
        comp.folderReorderingDrop(6, 4, DropPosition.ABOVE);
        rearrangedFolders = await comp.messagelistservice.folderCountSubject.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));

        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 6, 4, 3, 7, 5, 2]);
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 0, 0, 0, 0, 0]);

        console.log('move folder with id 6 inside 4');
        comp.folderReorderingDrop(6, 4, DropPosition.INSIDE);
        rearrangedFolders = await comp.messagelistservice.folderCountSubject.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));

        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 4, 6, 3, 7, 5, 2]);
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 1, 0, 0, 0, 0]);

        console.log('move folder with id 3 inside 5');
        comp.folderReorderingDrop(3, 5, DropPosition.INSIDE);
        rearrangedFolders = await comp.messagelistservice.folderCountSubject.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));

        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 4, 6, 7, 5, 3, 2]);
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 1, 0, 0, 1, 0]);

        console.log('move folder with id 4 above 5');
        comp.folderReorderingDrop(4, 5, DropPosition.ABOVE);
        rearrangedFolders = await comp.messagelistservice.folderCountSubject.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));

        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 7, 4, 6, 5, 3, 2]);
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 0, 1, 0, 1, 0]);

        console.log('move folder with id 6 below 7');
        comp.folderReorderingDrop(6, 7, DropPosition.BELOW);
        rearrangedFolders = await comp.messagelistservice.folderCountSubject.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));

        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 7, 6, 4, 5, 3, 2]);
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 0, 0, 0, 1, 0]);

        console.log('move folder with id 2 inside 3');
        comp.folderReorderingDrop(2, 3, DropPosition.INSIDE);
        rearrangedFolders = await comp.messagelistservice.folderCountSubject.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));

        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 7, 6, 4, 5, 3, 2]);
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 0, 0, 0, 1, 2]);

        console.log('move folder with id 4 below 3');
        comp.folderReorderingDrop(4, 3, DropPosition.BELOW);
        rearrangedFolders = await comp.messagelistservice.folderCountSubject.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));

        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 7, 6, 5, 3, 2, 4]);
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 0, 0, 1, 2, 1]);
    });
});
