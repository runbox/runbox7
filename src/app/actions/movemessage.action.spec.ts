// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2026 Runbox Solutions AS (runbox.com).
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

import { of } from 'rxjs';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';

import { FolderListEntry } from '../common/folderlistentry';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { MoveMessageDialogComponent } from './movemessage.action';

describe('MoveMessageDialogComponent', () => {
    const folders = [
        new FolderListEntry(1, 0, 10, 'inbox', 'Inbox', 'Inbox', 0),
        new FolderListEntry(2, 0, 5, 'user', 'Projects', 'Archive/Projects', 1),
        new FolderListEntry(3, 0, 2, 'user', 'Invoices', 'Archive/Invoices', 1),
        new FolderListEntry(4, 0, 4, 'sent', 'Sent', 'Sent', 0),
        new FolderListEntry(5, 0, 1, 'drafts', 'Drafts', 'Drafts', 0),
        new FolderListEntry(6, 0, 1, 'templates', 'Templates', 'Templates', 0),
    ];

    let dialogRef: MatDialogRef<MoveMessageDialogComponent>;
    let component: MoveMessageDialogComponent;

    beforeEach(() => {
        dialogRef = {
            close: jasmine.createSpy('close'),
        } as unknown as MatDialogRef<MoveMessageDialogComponent>;
        const rmmapi = {
            getFolderList: () => of(folders),
        } as unknown as RunboxWebmailAPI;
        component = new MoveMessageDialogComponent(dialogRef, rmmapi);
    });

    it('should exclude folders that cannot be used as move targets', () => {
        component.ngOnInit();

        expect(component.folderListEntries.map(folder => folder.folderName))
            .toEqual(['Inbox', 'Projects', 'Invoices']);
        expect(component.filteredFolderListEntries.map(folder => folder.folderName))
            .toEqual(['Inbox', 'Projects', 'Invoices']);
    });

    it('should filter folders by name or path', () => {
        component.ngOnInit();

        component.folderFilter = 'archive';
        component.updateFolderFilter();
        expect(component.filteredFolderListEntries.map(folder => folder.folderName))
            .toEqual(['Projects', 'Invoices']);

        component.folderFilter = 'invoice';
        component.updateFolderFilter();
        expect(component.filteredFolderListEntries.map(folder => folder.folderName))
            .toEqual(['Invoices']);
    });

    it('should close with the selected folder id', () => {
        component.moveMessages(3);

        expect(dialogRef.close).toHaveBeenCalledWith(3);
    });
});
