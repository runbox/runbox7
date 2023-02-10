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

import { Injectable } from '@angular/core';
import { WebSocketSearchMailRow } from '../websocketsearch/websocketsearchmailrow.class';
import { Subject, AsyncSubject } from 'rxjs';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { take } from 'rxjs/operators';

@Injectable()
export class WebSocketSearchService {

    websocket: WebSocket;
    searchresults: Subject<WebSocketSearchMailRow[]> = new Subject();
    searchReadySubject: AsyncSubject<any> = new AsyncSubject();

    lastRequestedSearchText = null;
    searchInProgress = false;

    constructor(
        public snackbar: MatSnackBar
    ) {

    }

    open() {
        const ws = new WebSocket(
            location.protocol.replace('http', 'ws')
            + '//' +
            location.host + '/websocket'
        );

        ws.onopen = () => {
            console.log('websocket search connected');

        };

        ws.onclose = () => {
            console.log('websocket search disconnected');
            this.searchInProgress = false;
        };

        ws.onerror = (e) => {
            console.log('websocket error', e);
            this.searchInProgress = false;
        };

        ws.onmessage = (data) => {
            const parsed = JSON.parse(data.data);
            if (parsed['error']) {
                this.snackbar.open(parsed['error'], 'Dismiss').afterDismissed().subscribe(() =>
                    this.searchInProgress = false
                );
            } else {
                const parseddata: any[] = parsed;
                if (parseddata.length > 0 && Array.isArray(parseddata[0])) {
                    this.searchresults.next(parseddata
                        .map((row: any[]) => {
                            return {
                                id: parseInt(row[0].substr(1), 10),
                                dateTime: row[1],
                                subject: row[3],
                                fromName: row[2],
                                fromAddr: row[4],
                                seen: row[6] === 1,
                                size: row[5]
                            };
                        })
                    );
                } else if (parseddata.length === 1 && parseddata[0].indexOf('Ready') === 0) {
                    this.searchReadySubject.next(true);
                    this.searchReadySubject.complete();
                } else if (parseddata.length === 0) {
                    this.searchresults.next([]);
                }
            }
        };

        this.websocket = ws;

    }

    search(searchText: string) {
        searchText = searchText ? searchText.trim() : '';
        this.lastRequestedSearchText = searchText;

        if (this.searchInProgress) {
            return;
        }

        if (searchText.length === 0) {
            this.searchresults.next(null);
            return;
        }

        this.searchInProgress = true;

        this.searchReadySubject
            .subscribe(() => {
                console.log('Processing search request for', searchText);

                this.websocket.send(JSON.stringify({
                    querystring: searchText,
                    sortcol: 2, // Xapian value slot to sort
                    reverse: 1,
                    offset: 0,
                    maxresults: 100,
                    collapsecol: -1
                }));
                this.searchresults
                    .pipe(
                        take(1)
                    ).subscribe(() => {
                        this.searchInProgress = false;
                        console.log('search done');
                        if (this.lastRequestedSearchText !== searchText) {
                            this.search(this.lastRequestedSearchText);
                        }
                    });
            });
    }

    close() {
        this.websocket.close();
        this.searchReadySubject = new AsyncSubject();
        this.searchInProgress = false;
    }

}
