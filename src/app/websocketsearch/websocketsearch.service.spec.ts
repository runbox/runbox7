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

import { TestBed } from '@angular/core/testing';
import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
import { WebSocketSearchService } from './websocketsearch.service';

describe('WebSocketSearchService', () => {
    let service: WebSocketSearchService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                MatSnackBarModule
            ],
            providers: [
                WebSocketSearchService
            ]
        });

        service = TestBed.inject(WebSocketSearchService);
    });

    it('should open a websocket automatically before searching', () => {
        const websocket = {
            readyState: WebSocket.OPEN,
            send: jasmine.createSpy('send'),
            close: jasmine.createSpy('close')
        } as unknown as WebSocket;

        spyOn(service, 'open').and.callFake(() => {
            service.websocket = websocket;
        });

        service.search('subject:test');

        expect(service.open).toHaveBeenCalled();
        expect(service.searchInProgress).toBeTrue();

        service.searchReadySubject.next(true);
        service.searchReadySubject.complete();

        expect(websocket.send).toHaveBeenCalledWith(JSON.stringify({
            querystring: 'subject:test',
            sortcol: 2,
            reverse: 1,
            offset: 0,
            maxresults: 100,
            collapsecol: -1
        }));

        service.searchresults.next([]);

        expect(service.searchInProgress).toBeFalse();
    });

    it('should reset websocket state when closing', () => {
        const websocket = {
            readyState: WebSocket.OPEN,
            send: jasmine.createSpy('send'),
            close: jasmine.createSpy('close')
        } as unknown as WebSocket;

        service.websocket = websocket;
        service.searchInProgress = true;

        service.close();

        expect(websocket.close).toHaveBeenCalled();
        expect(service.websocket).toBeNull();
        expect(service.searchInProgress).toBeFalse();
    });
});
