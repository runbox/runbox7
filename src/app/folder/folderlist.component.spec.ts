// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2020 Runbox Solutions AS (runbox.com).
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

import { FolderListComponent, DropPosition, CreateFolderEvent, MoveFolderEvent } from './folderlist.component';
import { FolderListEntry, RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { BehaviorSubject, of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { TestBed, getTestBed } from '@angular/core/testing';
import { take } from 'rxjs/operators';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DialogModule } from '../dialog/dialog.module';
import { HotkeysService } from 'angular2-hotkeys';

class MatDialogMock {
    open() {
      return {
        afterClosed: () => of('testtest')
      };
    }
  }

describe('FolderListComponent', () => {
    let injector: TestBed;
    let dialog: MatDialog;
    let hotkeyMock: HotkeysService;

    beforeEach(() => {
        TestBed.configureTestingModule({
        imports: [
                HttpClientTestingModule,
                MatSnackBarModule,
                MatDialogModule,
                DialogModule,
                NoopAnimationsModule
            ],
        providers: [RunboxWebmailAPI, { provide: MatDialog, useClass: MatDialogMock }]
        });
        injector = getTestBed();
        dialog = injector.get(MatDialog);
        hotkeyMock = { add: _ => null } as HotkeysService;
    });

    it('folderReorderingDrop', async () => {
        const comp = new FolderListComponent(null, hotkeyMock);
        comp.folders = new BehaviorSubject([
            new FolderListEntry(1, 50, 40, 'inbox', 'folder1', 'folder2', 0),
            new FolderListEntry(2, 50, 40, 'user', 'folder2', 'folder2', 0),
            new FolderListEntry(3, 50, 40, 'user', 'subfolder', 'folder2.subfolder', 1),
            new FolderListEntry(4, 50, 40, 'user', 'subsubfolder', 'folder2.subfolder.subsubfolder', 2),
            new FolderListEntry(5, 50, 40, 'user', 'subsubfolder2', 'folder2.subfolder.subsubfolder2', 2),
            new FolderListEntry(6, 50, 40, 'user', 'subsubfolder3', 'folder2.subfolder.subsubfolder3', 2),
            new FolderListEntry(7, 50, 40, 'user', 'folder3', 'folder3', 0)
        ]);

        let moveEvent: MoveFolderEvent, rearrangedFolders: FolderListEntry[];
        comp.moveFolder.subscribe((e: MoveFolderEvent) => moveEvent = e);

        console.log('move folder with id 6 above 5');
        await comp.folderReorderingDrop(6, 5, DropPosition.ABOVE);
        rearrangedFolders = await comp.folders.pipe(take(1)).toPromise();
        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 2, 3, 4, 6, 5, 7]);
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 1, 2, 2, 2, 0]);

        console.log('move folder with id 6 above 5 - should not cause any changes');
        await comp.folderReorderingDrop(6, 5, DropPosition.ABOVE);
        rearrangedFolders = await comp.folders.pipe(take(1)).toPromise();
        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 2, 3, 4, 6, 5, 7]);
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 1, 2, 2, 2, 0]);

        console.log('move folder with id 6 below 5');
        comp.folderReorderingDrop(6, 5, DropPosition.BELOW);
        rearrangedFolders = await comp.folders.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));
        expect(moveEvent.order).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 1, 2, 2, 2, 0]);

        console.log('move folder with id 5 below 7');
        comp.folderReorderingDrop(5, 7, DropPosition.BELOW);
        rearrangedFolders = await comp.folders.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));
        expect(moveEvent.order).toEqual([1, 2, 3, 4, 6, 7, 5]);
        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 2, 3, 4, 6, 7, 5]);
        expect(rearrangedFolders[6].folderPath).toBe('subsubfolder2');
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 1, 2, 2, 0, 0]);

        console.log('move folder with id 5 inside 7');
        comp.folderReorderingDrop(5, 7, DropPosition.INSIDE);
        rearrangedFolders = await comp.folders.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));
        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 2, 3, 4, 6, 7, 5]);
        expect(rearrangedFolders[6].folderPath).toBe('folder3/subsubfolder2');
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 1, 2, 2, 0, 1]);

        console.log('move folder with id 7 above 1');
        comp.folderReorderingDrop(7, 1, DropPosition.ABOVE);
        rearrangedFolders = await comp.folders.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));
        expect(rearrangedFolders.map(f => f.folderId)).toEqual([7, 5, 1, 2, 3, 4, 6]);
        expect(rearrangedFolders[0].folderPath).toBe('folder3');
        expect(rearrangedFolders[1].folderPath).toBe('folder3/subsubfolder2');
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 1, 0, 0, 1, 2, 2]);

        console.log('move folder with id 7 below 1');
        comp.folderReorderingDrop(7, 1, DropPosition.BELOW);
        rearrangedFolders = await comp.folders.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));
        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 7, 5, 2, 3, 4, 6]);
        expect(rearrangedFolders[1].folderPath).toBe('folder3');
        expect(rearrangedFolders[2].folderPath).toBe('folder3/subsubfolder2');
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 1, 0, 1, 2, 2]);

        console.log('move folder with id 4 above 7');
        comp.folderReorderingDrop(4, 7, DropPosition.ABOVE);
        rearrangedFolders = await comp.folders.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));
        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 4, 7, 5, 2, 3, 6]);
        expect(rearrangedFolders[1].folderPath).toBe('subsubfolder');
        expect(rearrangedFolders[2].folderPath).toBe('folder3');
        expect(rearrangedFolders[3].folderPath).toBe('folder3/subsubfolder2');
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 0, 1, 0, 1, 2]);

        console.log('move folder with id 5 below 7');
        comp.folderReorderingDrop(5, 7, DropPosition.BELOW);
        rearrangedFolders = await comp.folders.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));
        expect(rearrangedFolders[2].folderPath).toBe('folder3');
        expect(rearrangedFolders[3].folderPath).toBe('subsubfolder2');
        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 4, 7, 5, 2, 3, 6]);
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 0, 0, 0, 1, 2]);

        console.log('move folder with id 6 below 3');
        comp.folderReorderingDrop(6, 3, DropPosition.BELOW);
        rearrangedFolders = await comp.folders.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));

        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 4, 7, 5, 2, 3, 6]);
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 0, 0, 0, 1, 1]);

        console.log('move folder with id 6 inside 7');
        comp.folderReorderingDrop(6, 7, DropPosition.INSIDE);
        rearrangedFolders = await comp.folders.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));

        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 4, 7, 6, 5, 2, 3]);
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 0, 1, 0, 0, 1]);

        console.log('move folder with id 3 above 7');
        comp.folderReorderingDrop(3, 7, DropPosition.ABOVE);
        rearrangedFolders = await comp.folders.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));

        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 4, 3, 7, 6, 5, 2]);
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 0, 0, 1, 0, 0]);

        console.log('move folder with id 6 above 4');
        comp.folderReorderingDrop(6, 4, DropPosition.ABOVE);
        rearrangedFolders = await comp.folders.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));

        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 6, 4, 3, 7, 5, 2]);
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 0, 0, 0, 0, 0]);

        console.log('move folder with id 6 inside 4');
        comp.folderReorderingDrop(6, 4, DropPosition.INSIDE);
        rearrangedFolders = await comp.folders.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));

        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 4, 6, 3, 7, 5, 2]);
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 1, 0, 0, 0, 0]);

        console.log('move folder with id 3 inside 5');
        comp.folderReorderingDrop(3, 5, DropPosition.INSIDE);
        rearrangedFolders = await comp.folders.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));

        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 4, 6, 7, 5, 3, 2]);
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 1, 0, 0, 1, 0]);

        console.log('move folder with id 4 above 5');
        comp.folderReorderingDrop(4, 5, DropPosition.ABOVE);
        rearrangedFolders = await comp.folders.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));

        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 7, 4, 6, 5, 3, 2]);
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 0, 1, 0, 1, 0]);

        console.log('move folder with id 6 below 7');
        comp.folderReorderingDrop(6, 7, DropPosition.BELOW);
        rearrangedFolders = await comp.folders.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));

        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 7, 6, 4, 5, 3, 2]);
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 0, 0, 0, 1, 0]);

        console.log('move folder with id 2 inside 3');
        comp.folderReorderingDrop(2, 3, DropPosition.INSIDE);
        rearrangedFolders = await comp.folders.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));

        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 7, 6, 4, 5, 3, 2]);
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 0, 0, 0, 1, 2]);

        console.log('move folder with id 4 below 3');
        comp.folderReorderingDrop(4, 3, DropPosition.BELOW);
        rearrangedFolders = await comp.folders.pipe(take(1)).toPromise();
        console.log(rearrangedFolders.map(f => f.folderId));

        expect(rearrangedFolders.map(f => f.folderId)).toEqual([1, 7, 6, 5, 3, 2, 4]);
        expect(rearrangedFolders.map(f => f.folderLevel)).toEqual([0, 0, 0, 0, 1, 2, 1]);
        expect(moveEvent.order).toEqual([1, 7, 6, 5, 3, 2, 4]);
    });

    it('should create new folder in root', async () => {
        const comp = new FolderListComponent(dialog, hotkeyMock);
        const folders = [
            new FolderListEntry(1, 50, 40, 'inbox', 'folder1', 'folder2', 0),
            new FolderListEntry(2, 50, 40, 'user', 'folder2', 'folder2', 0),
        ];
        const foldersSubject = new BehaviorSubject(folders);
        comp.folders = foldersSubject;

        comp.createFolder.subscribe((ev: CreateFolderEvent) =>
            foldersSubject.next([...folders, new FolderListEntry(3, 50, 40, 'user', ev.name, 'folder2', 0)])
        );
        comp.addFolder();
        const newListOfFolders = await comp.folders.pipe(take(1)).toPromise();

        console.log(newListOfFolders);

        expect(newListOfFolders.length).toEqual(3);
        expect(newListOfFolders[2].folderName).toEqual('testtest');
        expect(newListOfFolders[2].folderLevel).toEqual(0);
    });
});
