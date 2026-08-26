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
// Runbox 7 is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Runbox 7. If not, see <https://www.gnu.org/licenses/>.
// ---------- END RUNBOX LICENSE ----------

import { Subject } from 'rxjs';
import { RMM7MessageActions } from './rmm7messageactions';

interface SpamTrainingResponse {
    status: string;
    result: {
        changed_time: number;
        feedback: string;
    };
}

describe('RMM7MessageActions', () => {
    let actions: RMM7MessageActions;
    let remoteResponse: Subject<SpamTrainingResponse>;
    let mailViewerComponent: {
        close: jasmine.Spy;
        messageId: number;
    };
    let messageListService: {
        moveMessages: jasmine.Spy;
        spamFolderName: string;
    };
    let rmmapi: {
        showBackendErrors: jasmine.Spy;
        trainSpam: jasmine.Spy;
    };
    let searchService: {
        deleteMessages: jasmine.Spy;
        indexWorker: {
            postMessage: jasmine.Spy;
        };
        localSearchActivated: boolean;
    };
    let snackBar: {
        open: jasmine.Spy;
    };

    beforeEach(() => {
        remoteResponse = new Subject<SpamTrainingResponse>();
        mailViewerComponent = {
            close: jasmine.createSpy('close'),
            messageId: 1234
        };
        messageListService = {
            moveMessages: jasmine.createSpy('moveMessages'),
            spamFolderName: 'Spam'
        };
        rmmapi = {
            showBackendErrors: jasmine.createSpy('showBackendErrors'),
            trainSpam: jasmine.createSpy('trainSpam').and.returnValue(remoteResponse.asObservable())
        };
        searchService = {
            deleteMessages: jasmine.createSpy('deleteMessages'),
            indexWorker: {
                postMessage: jasmine.createSpy('postMessage')
            },
            localSearchActivated: false
        };
        snackBar = {
            open: jasmine.createSpy('open')
        };

        actions = new RMM7MessageActions();
        actions.mailViewerComponent = mailViewerComponent as unknown as RMM7MessageActions['mailViewerComponent'];
        actions.messageListService = messageListService as unknown as RMM7MessageActions['messageListService'];
        actions.rmmapi = rmmapi as unknown as RMM7MessageActions['rmmapi'];
        actions.searchService = searchService as unknown as RMM7MessageActions['searchService'];
        actions.snackBar = snackBar as unknown as RMM7MessageActions['snackBar'];
    });

    it('closes the message preview immediately when reporting spam', () => {
        actions.trainSpam({is_spam: 1});

        expect(searchService.deleteMessages).toHaveBeenCalledWith([1234]);
        expect(messageListService.moveMessages).toHaveBeenCalledWith([1234], 'Spam', true);
        expect(mailViewerComponent.close).toHaveBeenCalledTimes(1);
        expect(rmmapi.trainSpam).toHaveBeenCalledWith({is_spam: 1, messages: [1234]});

        remoteResponse.next({
            status: 'success',
            result: {
                changed_time: 0,
                feedback: 'Reported spam'
            }
        });
        remoteResponse.complete();

        expect(mailViewerComponent.close).toHaveBeenCalledTimes(1);
        expect(snackBar.open).toHaveBeenCalledWith('Reported spam', 'Dismiss', {duration: 3000});
    });
});
