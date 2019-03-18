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

import { Component, Output, EventEmitter } from '@angular/core';
import { WebSocketSearchMailRow } from '../websocketsearch/websocketsearchmailrow.class';

@Component({
    moduleId: 'angular2/app/rmm6/',
    templateUrl: 'rmm6search.component.html'
})
export class RMM6SearchComponent {

    @Output() onclose = new EventEmitter<any>();

    websocket: WebSocket;
    searchresults: WebSocketSearchMailRow[];

    constructor() {
        const ws = new WebSocket(
            location.protocol.replace('http', 'ws')
            + '//' +
            location.host + '/websocket'
        );

        ws.onopen = () => {
            console.log('connected');

        };

        ws.onclose = () => {
            console.log('disconnected');
        };

        ws.onmessage = (data) => {
            this.searchresults = JSON.parse(data.data)
                .filter((dataarr) =>
                    Array.isArray(dataarr)
                )
                .map((row: string[]) => {
                    return {
                        id: parseInt(row[0].substr(1), 10),
                        dateTime: row[1],
                        subject: row[3],
                        fromName: row[2],
                        fromAddr: row[4],
                        seen: row[5] === '1'
                    };
                });
            setTimeout(() => {
                window['doMessageBinds']();
            }, 100);
        };

        this.websocket = ws;

    }

    searchFieldKeyUp(searchText: string) {
        this.websocket.send(JSON.stringify({
            querystring: searchText,
            sortcol: 0,
            reverse: 0,
            offset: 0,
            maxresults: 100,
            collapsecol: -1
        }));
    }

    openMailViewer(messageId: number) {
        window['rmmangular'].openMailViewer(messageId);
    }

    close() {
        this.onclose.emit('closed');
    }
}
