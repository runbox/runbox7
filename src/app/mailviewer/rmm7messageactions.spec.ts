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

import { BehaviorSubject, of } from 'rxjs';

import { MoveMessageDialogComponent } from '../actions/movemessage.action';
import { DraftFormModel } from '../compose/draftdesk.service';
import { RMM7MessageActions } from './rmm7messageactions';

describe('RMM7MessageActions', () => {
    function makeActions() {
        const actions = new RMM7MessageActions();
        const moveToFolder = jasmine.createSpy('moveToFolder').and.returnValue(of({
            status: 'success',
            result: { changed_time: 0 },
        }));
        const close = jasmine.createSpy('close');
        const newDraft = jasmine.createSpy('newDraft');
        const folderListSubject = new BehaviorSubject<any[]>([
            { folderId: 1, folderPath: 'Inbox' },
            { folderId: 7, folderPath: 'Archive' },
        ]);

        actions.dialog = {
            open: jasmine.createSpy('open').and.returnValue({
                afterClosed: () => of(7),
            }),
        } as any;
        actions.draftDeskService = {
            fromsSubject: new BehaviorSubject<any[]>([
                { email: 'me@example.com' },
            ]),
            newDraft,
        } as any;
        actions.mailViewerComponent = {
            messageId: 42,
            mailObj: {
                mid: 42,
                headers: {
                    'message-id': '<message-42@example.com>',
                },
                from: [
                    { name: 'Sender', address: 'sender@example.com' },
                ],
                to: [
                    { name: 'Me', address: 'me@example.com' },
                ],
                date: new Date(2026, 0, 2, 9, 30),
                subject: 'Source subject',
                rawtext: 'Message body',
            },
            close,
        } as any;
        actions.messageListService = {
            currentFolder: 'Inbox',
            folderListSubject,
            moveMessages: jasmine.createSpy('moveMessages'),
            rmmapi: { moveToFolder },
        } as any;
        actions.rmmapi = {
            showBackendErrors: jasmine.createSpy('showBackendErrors'),
        } as any;
        actions.searchService = {
            moveMessagesToFolder: jasmine.createSpy('moveMessagesToFolder'),
            indexWorker: {
                postMessage: jasmine.createSpy('postMessage'),
            },
        } as any;

        return {
            actions,
            close,
            moveToFolder,
            newDraft,
        };
    }

    it('moves the open message before opening a reply draft', () => {
        const { actions, close, moveToFolder, newDraft } = makeActions();

        (actions as any).replyAndMove(false);

        expect(actions.dialog.open).toHaveBeenCalledWith(MoveMessageDialogComponent);
        expect(actions.searchService.moveMessagesToFolder).toHaveBeenCalledWith([42], 'Archive');
        expect(actions.messageListService.moveMessages).toHaveBeenCalledWith([42], 'Archive');
        expect(moveToFolder).toHaveBeenCalledWith([42], 7, 1);
        expect(newDraft).toHaveBeenCalled();
        const draft = newDraft.calls.mostRecent().args[0] as DraftFormModel;
        expect(draft.reply_to_id as any).toBe(42);
        expect(draft.subject).toBe('Re: Source subject');
        expect(close).toHaveBeenCalledWith('goToDraftDesk');
    });
});
