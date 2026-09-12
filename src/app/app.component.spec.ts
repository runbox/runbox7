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

import { AppComponent } from './app.component';
import { MessageList } from './common/messagelist';
import { MessageInfo } from './common/messageinfo';
import { CanvasTableComponent } from './canvastable/canvastable';
import { MessageListService } from './rmmapi/messagelist.service';
import { SearchService } from './xapian/searchservice';
import { SearchMessageDisplay } from './xapian/searchmessagedisplay';
import { WebSocketSearchService } from './websocketsearch/websocketsearch.service';
import { WebSocketSearchMailList } from './websocketsearch/websocketsearchmaillist';

describe('Unread-only empty message list (#689)', () => {
    let app: AppComponent & { readonly showUnreadEmptyState: boolean };
    let messages: MessageInfo[];

    beforeEach(() => {
        // Exercise the view state without starting account subscriptions or network requests.
        app = Object.create(AppComponent.prototype);
        messages = [{ id: 1, seenFlag: true } as MessageInfo];
        app.unreadMessagesOnlyCheckbox = true;
        app.selectedFolder = 'Inbox';
        app.viewmode = 'messages';
        app.hasChildRouterOutlet = false;
        app.showingSearchResults = false;
        app.showingWebSocketSearchResults = false;
        app.messagelist = messages;
        app.messagelistservice = {
            fetchInProgress: false,
            ignoreUnreadInFolders: ['Sent'],
            folderMessageLists: { Inbox: messages }
        } as unknown as MessageListService;
        app.searchService = { downloadProgress: null } as SearchService;
        app.websocketsearchservice = { searchInProgress: false } as WebSocketSearchService;
        app.canvastable = { rows: new MessageList(messages) } as unknown as CanvasTableComponent;
        app.filterMessageDisplay();
    });

    it('explains a loaded folder with read messages but no unread results', () => {
        expect(app.canvastable.rows.rowCount()).toBe(0);
        expect(app.showUnreadEmptyState).toBeTrue();
    });

    it('also explains a successfully loaded, completely empty folder', () => {
        messages.length = 0;
        app.canvastable.rows.setRows(messages);
        expect(app.showUnreadEmptyState).toBeTrue();
    });

    it('hides the notice when the unread filter is disabled', () => {
        app.unreadMessagesOnlyCheckbox = false;
        expect(app.showUnreadEmptyState).toBeFalse();
    });

    it('hides the notice when an unread message appears', () => {
        messages.push({ id: 2, seenFlag: false } as MessageInfo);
        app.canvastable.rows.setRows(messages);
        app.filterMessageDisplay();
        expect(app.canvastable.rows.rowCount()).toBe(1);
        expect(app.showUnreadEmptyState).toBeFalse();
    });

    it('does not mistake initial or failed loading for an empty result', () => {
        app.messagelist = [];
        app.canvastable.rows = new MessageList(app.messagelist);
        app.messagelistservice.folderMessageLists.Inbox = [];
        expect(app.showUnreadEmptyState).toBeFalse();
    });

    it('does not carry the previous folder notice into a new folder', () => {
        app.selectedFolder = 'Archive';
        app.messagelistservice.folderMessageLists.Archive = [];
        expect(app.showUnreadEmptyState).toBeFalse();
    });

    it('waits for a folder refresh to finish', () => {
        app.messagelistservice.fetchInProgress = true;
        expect(app.showUnreadEmptyState).toBeFalse();
        app.messagelistservice.fetchInProgress = false;
        expect(app.showUnreadEmptyState).toBeTrue();
    });

    it('waits for an index download to finish', () => {
        app.searchService.downloadProgress = 0;
        expect(app.showUnreadEmptyState).toBeFalse();
    });

    it('handles an empty local-index result', () => {
        app.showingSearchResults = true;
        app.canvastable.rows = new SearchMessageDisplay(app.searchService, []);
        expect(app.showUnreadEmptyState).toBeTrue();
        app.canvastable.rows.setRows([[1]]);
        expect(app.showUnreadEmptyState).toBeFalse();
    });

    it('waits for a websocket search and explains its empty unread results', () => {
        app.showingWebSocketSearchResults = true;
        app.canvastable.rows = new WebSocketSearchMailList([{ id: 1, seen: true }]);
        app.filterMessageDisplay();
        app.websocketsearchservice.searchInProgress = true;
        expect(app.showUnreadEmptyState).toBeFalse();
        app.websocketsearchservice.searchInProgress = false;
        expect(app.showUnreadEmptyState).toBeTrue();
    });

    it('does not label Sent or threaded views as unread-only results', () => {
        app.selectedFolder = 'Sent';
        expect(app.showUnreadEmptyState).toBeFalse();
        app.selectedFolder = 'Inbox';
        app.viewmode = 'conversations';
        expect(app.showUnreadEmptyState).toBeFalse();
    });

    it('hides the notice in child routes and before the table exists', () => {
        app.hasChildRouterOutlet = true;
        expect(app.showUnreadEmptyState).toBeFalse();
        app.hasChildRouterOutlet = false;
        app.canvastable = undefined;
        expect(app.showUnreadEmptyState).toBeFalse();
    });
});
