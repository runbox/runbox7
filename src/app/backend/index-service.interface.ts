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

import { Observable } from 'rxjs';
import { InjectionToken } from '@angular/core';

/**
 * Indexed message data structure
 */
export interface IndexedMessage {
    id: string;
    from: string;
    subject: string;
    folder: string;
    date: Date;
    seen: boolean;
    flagged: boolean;
    answered: boolean;
    deleted: boolean;
    hasAttachment: boolean;
    recipients?: string[];
    textContent?: string;
}

/**
 * Search result from index
 */
export interface SearchResult {
    docId: number;
    messageId: string;
    score?: number;
}

/**
 * Abstract index service interface.
 * Wraps Xapian or other local search implementations.
 *
 * IMPORTANT: IndexService is OPTIONAL. Not all backends require local indexing:
 * - Runbox: Uses Xapian for local search (WebAssembly)
 * - JMAP: Has server-side search, may not need local index
 *
 * When index is inactive (isActive === false):
 * - search() returns empty results
 * - getMessageData() returns null
 * - getMessageText() returns empty string
 * - Mutation methods (add/update/delete/move) are no-ops
 *
 * Recommended fallback pattern when !isActive:
 * - Message listing: MailBackend.queryEmails()
 * - Message content/preview: MailBackend.getEmailContent()
 * - Search: MailBackend.queryEmails() with server-side filtering
 *
 * Use Optional injection: @Inject(INDEX_SERVICE) @Optional()
 */
export interface IndexService {
    /**
     * Whether local search is currently active and usable.
     * When false, search methods return empty results and
     * mutations are no-ops. Consumers should use MailBackend instead.
     */
    readonly isActive: boolean;

    /**
     * Observable that fires when index is reloaded (full refresh).
     * Consumers should refresh their message lists.
     */
    readonly indexReloaded$: Observable<void>;

    /**
     * Observable that fires when index is updated (incremental).
     * Consumers may want to refresh counts or visible messages.
     */
    readonly indexUpdated$: Observable<void>;

    /**
     * Initialize the index.
     * @returns Observable<boolean> - true if index became active, false otherwise
     */
    init(): Observable<boolean>;

    /**
     * Add messages to the index.
     * No-op when isActive is false.
     */
    addMessages(messages: IndexedMessage[]): Observable<void>;

    /**
     * Update message flags in the index.
     * No-op when isActive is false.
     */
    updateFlags(messageId: string, flags: { seen?: boolean; flagged?: boolean }): Observable<void>;

    /**
     * Move messages to a different folder in the index.
     * No-op when isActive is false.
     */
    moveMessages(messageIds: string[], toFolder: string): Observable<void>;

    /**
     * Delete messages from the index.
     * No-op when isActive is false.
     */
    deleteMessages(messageIds: string[]): Observable<void>;

    /**
     * Search the index.
     * Returns empty array when isActive is false.
     */
    search(query: string, options?: {
        folder?: string;
        unreadOnly?: boolean;
        limit?: number;
        offset?: number;
    }): Observable<SearchResult[]>;

    /**
     * Get message data from the index by document ID.
     * Returns null when isActive is false.
     */
    getMessageData(docId: number): IndexedMessage | null;

    /**
     * Get message text content (may fetch from backend if not cached).
     * Returns empty string when isActive is false.
     *
     * When index is inactive, callers needing message content should use
     * MailBackend.getEmailContent(id) instead.
     */
    getMessageText(messageId: string): Promise<string>;

    /**
     * Get messages in a time range.
     * Returns empty array when isActive is false.
     */
    getMessagesInTimeRange(start: Date, end: Date, folder?: string): string[];

    /**
     * Persist the index to storage.
     * Returns false when isActive is false.
     */
    persistIndex(): Observable<boolean>;

    /**
     * Delete the local index.
     * Always completes (no-op if no index exists).
     */
    deleteIndex(): Observable<void>;

    /**
     * Download index from server (if available).
     * Returns false when not supported or download fails.
     */
    downloadFromServer(): Observable<boolean>;

    /**
     * Set current folder context (for background sync).
     * No-op when isActive is false.
     */
    setCurrentFolder(folder: string): void;
}

/**
 * Injection token for IndexService.
 * Use @Optional() when injecting as not all backends provide an index.
 *
 * @example
 * constructor(@Inject(INDEX_SERVICE) @Optional() private indexService?: IndexService) {
 *   if (this.indexService?.isActive) {
 *     // Use local search
 *   } else {
 *     // Fall back to server-side search via MailBackend
 *   }
 * }
 */
export const INDEX_SERVICE = new InjectionToken<IndexService>('IndexService');
