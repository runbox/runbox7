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

import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { of } from 'rxjs';
import { FolderListEntry } from '../common/folderlistentry';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { MoveMessageDialogComponent } from './movemessage.action';

describe('MoveMessageDialogComponent', () => {
    it('includes Sent and Templates destinations while excluding Drafts', () => {
        const folders = [
            new FolderListEntry(1, 0, 0, 'inbox', 'Inbox', 'Inbox', 0),
            new FolderListEntry(2, 0, 0, 'sent', 'Sent', 'Sent', 0),
            new FolderListEntry(3, 0, 0, 'templates', 'Templates', 'Templates', 0),
            new FolderListEntry(4, 0, 0, 'drafts', 'Drafts', 'Drafts', 0),
            new FolderListEntry(5, 0, 0, 'user', 'Archive', 'Archive', 0),
        ];
        const component = new MoveMessageDialogComponent(
            { close: jasmine.createSpy('close') } as unknown as MatDialogRef<MoveMessageDialogComponent>,
            { getFolderList: () => of(folders) } as unknown as RunboxWebmailAPI,
        );

        component.ngOnInit();

        expect(component.folderListEntries.map(folder => folder.folderType)).toEqual([
            'inbox',
            'sent',
            'templates',
            'user',
        ]);
    });

    it('closes the dialog with the selected folder id', () => {
        const dialogRef = { close: jasmine.createSpy('close') };
        const component = new MoveMessageDialogComponent(
            dialogRef as unknown as MatDialogRef<MoveMessageDialogComponent>,
            { getFolderList: () => of([]) } as unknown as RunboxWebmailAPI,
        );

        component.moveMessages(42);

        expect(dialogRef.close).toHaveBeenCalledWith(42);
    });
});
