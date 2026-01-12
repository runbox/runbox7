// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2025 Runbox Solutions AS (runbox.com).
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
import { AppComponent } from './app.component';

describe('AppComponent message actions', () => {
    const messageIds = [11, 12];

    const buildComponent = () => {
        const component = Object.create(AppComponent.prototype) as AppComponent;
        const rows = {
            removeMessages: jasmine.createSpy('removeMessages'),
            selectedMessageIds: () => messageIds,
            anySelected: jasmine.createSpy('anySelected').and.returnValue(false),
            selectRow: jasmine.createSpy('selectRow'),
            clearSelection: jasmine.createSpy('clearSelection'),
        };

        component.messageTable = { rows } as any;
        component.updateRows = jasmine.createSpy('updateRows');
        component.searchService = {
            localSearchActivated: true,
            moveMessagesToFolder: jasmine.createSpy('moveMessagesToFolder'),
            deleteMessages: jasmine.createSpy('deleteMessages'),
        } as any;
        component.messagelistservice = {
            trashFolderName: 'Trash',
            moveMessages: jasmine.createSpy('moveMessages'),
            deleteTrashMessages: jasmine.createSpy('deleteTrashMessages'),
            folderListSubject: { value: [{ folderId: 5, folderPath: 'Inbox' }] },
            currentFolder: 'Inbox',
            rmmapi: { moveToFolder: jasmine.createSpy('moveToFolder') },
        } as any;
        component.selectedFolder = 'Inbox';
        component.singlemailviewer = undefined;
        component.rmmapi = {
            deleteMessages: jasmine.createSpy('deleteMessages'),
            moveToFolder: jasmine.createSpy('moveToFolder'),
        } as any;
        component.dialog = {
            open: jasmine.createSpy('open').and.returnValue({
                afterClosed: () => of(5),
            }),
        } as any;
        component.messageActionsHandler = {
            updateMessages: jasmine.createSpy('updateMessages').and.callFake((args) => {
                args.updateLocal(args.messageIds);
                return Promise.resolve();
            }),
        } as any;

        return { component, rows };
    };

    it('repaints after deleting messages', () => {
        const { component, rows } = buildComponent();

        component.deleteMessages();

        expect(rows.removeMessages).toHaveBeenCalledWith(messageIds);
        expect(component.updateRows).toHaveBeenCalled();
        expect(component.searchService.deleteMessages).toHaveBeenCalledWith(messageIds);
    });

    it('repaints and updates local index on dropToFolder', () => {
        const { component, rows } = buildComponent();

        component.dropToFolder(5);

        expect(rows.removeMessages).toHaveBeenCalledWith(messageIds);
        expect(component.updateRows).toHaveBeenCalled();
        expect(component.searchService.moveMessagesToFolder).toHaveBeenCalledWith(messageIds, 'Inbox');
    });

    it('repaints and updates local index on moveToFolder', () => {
        const { component, rows } = buildComponent();

        component.moveToFolder();

        expect(rows.removeMessages).toHaveBeenCalledWith(messageIds);
        expect(component.updateRows).toHaveBeenCalled();
        expect(component.searchService.moveMessagesToFolder).toHaveBeenCalledWith(messageIds, 'Inbox');
    });

    it('auto-selects dragged row when none selected', () => {
        const { component, rows } = buildComponent();
        rows.anySelected.and.returnValue(false);
        const event = { dataTransfer: { setDragImage: jasmine.createSpy('setDragImage') } } as any;

        component.onMessagesDragStart(event, 3);

        expect(rows.selectRow).toHaveBeenCalledWith(3);
    });

    it('does not change selection on drag when a row is already selected', () => {
        const { component, rows } = buildComponent();
        rows.anySelected.and.returnValue(true);
        const event = { dataTransfer: { setDragImage: jasmine.createSpy('setDragImage') } } as any;

        component.onMessagesDragStart(event, 3);

        expect(rows.selectRow).not.toHaveBeenCalled();
    });
});
