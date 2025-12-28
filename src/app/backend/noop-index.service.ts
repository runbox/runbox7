// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2024 Runbox Solutions AS (runbox.com).
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
import { Observable, of, EMPTY } from 'rxjs';

import { IndexService, IndexedMessage, SearchResult } from './index-service.interface';

/**
 * No-op implementation of IndexService.
 * Used when local indexing is disabled or not supported by the backend.
 *
 * All methods return sensible defaults:
 * - isActive is always false
 * - Search methods return empty results
 * - Mutation methods complete immediately as no-ops
 *
 * Consumers should check isActive and fall back to MailBackend.queryEmails()
 * for message listing when this service is injected.
 */
@Injectable({
    providedIn: 'root'
})
export class NoOpIndexService implements IndexService {
    readonly isActive = false;

    // Complete immediately - no index events will ever occur
    readonly indexReloaded$ = EMPTY;
    readonly indexUpdated$ = EMPTY;

    init(): Observable<boolean> {
        return of(false);
    }

    addMessages(_messages: IndexedMessage[]): Observable<void> {
        return of(undefined);
    }

    updateFlags(_messageId: string, _flags: { seen?: boolean; flagged?: boolean }): Observable<void> {
        return of(undefined);
    }

    moveMessages(_messageIds: string[], _toFolder: string): Observable<void> {
        return of(undefined);
    }

    deleteMessages(_messageIds: string[]): Observable<void> {
        return of(undefined);
    }

    search(_query: string, _options?: {
        folder?: string;
        unreadOnly?: boolean;
        limit?: number;
        offset?: number;
    }): Observable<SearchResult[]> {
        return of([]);
    }

    getMessageData(_docId: number): IndexedMessage | null {
        return null;
    }

    getMessageText(_messageId: string): Promise<string> {
        return Promise.resolve('');
    }

    getMessagesInTimeRange(_start: Date, _end: Date, _folder?: string): string[] {
        return [];
    }

    persistIndex(): Observable<boolean> {
        return of(false);
    }

    deleteIndex(): Observable<void> {
        return of(undefined);
    }

    downloadFromServer(): Observable<boolean> {
        return of(false);
    }

    setCurrentFolder(_folder: string): void {
        // No-op
    }
}
