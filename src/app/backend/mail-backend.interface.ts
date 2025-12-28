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
 * Represents a mailbox/folder
 */
export interface Mailbox {
    /** Unique identifier for folder operations (numeric ID as string for Runbox) */
    id: string;
    /** Display name of the mailbox */
    name: string;
    /** Full path used for message queries (e.g., "Inbox", "Folder.Subfolder") */
    path: string;
    parentId?: string;
    totalMessages: number;
    unreadMessages: number;
    role?: string; // inbox, drafts, sent, trash, spam, archive
    sortOrder?: number;
}

/**
 * Represents an email message (header/metadata only)
 */
export interface EmailHeader {
    id: string;
    /**
     * Mailbox IDs where the message resides.
     * JMAP: messages can be in multiple mailboxes (label-like semantics)
     * Runbox: single mailbox, array will have one element
     */
    mailboxIds: string[];
    /**
     * Primary mailbox path for display (optional, computed from mailboxIds[0])
     * Runbox: folder path like "Inbox", "Folder.Subfolder"
     * JMAP: may be empty if mailbox names need separate lookup
     */
    mailboxPath?: string;
    threadId?: string;
    subject: string;
    from: string;
    to: string;
    cc?: string;
    bcc?: string;
    date: Date;
    size: number;
    seen: boolean;
    flagged: boolean;
    answered: boolean;
    hasAttachment: boolean;
    preview?: string;
}

/**
 * Represents full email content
 */
export interface EmailContent {
    id: string;
    textBody?: string;
    htmlBody?: string;
    attachments?: EmailAttachment[];
}

/**
 * Represents an email attachment
 */
export interface EmailAttachment {
    /** Attachment identifier (partId for Runbox) */
    id: string;
    /** Blob identifier for JMAP attachment download */
    blobId?: string;
    name: string;
    type: string;
    size: number;
    /** Content-ID for inline attachments */
    contentId?: string;
    /** Content disposition: inline or attachment */
    disposition?: 'inline' | 'attachment';
}

/**
 * Represents changes since last sync
 */
export interface EmailChanges {
    newState: string;
    created: string[];
    updated: string[];
    destroyed: string[];
    hasMoreChanges: boolean;
}

/**
 * Query options for listing emails
 */
export interface EmailQueryOptions {
    /** Mailbox ID to filter by (JMAP preferred) */
    mailboxId?: string;
    /** Mailbox path to filter by (Runbox preferred, use Mailbox.path) */
    mailboxPath?: string;
    /** Runbox-specific: fetch messages with ID greater than this */
    sinceId?: number;
    /** Runbox-specific: fetch messages changed after this date */
    sinceChangedDate?: Date;
    limit?: number;
    offset?: number;
    includeContent?: boolean;
}

/**
 * Draft email for sending
 */
export interface DraftEmail {
    id?: string;
    from: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    textBody?: string;
    htmlBody?: string;
    inReplyTo?: string;
    replyToId?: string;
    attachments?: string[];
    tags?: string;
}

/**
 * Abstract mail backend interface.
 * Implementations: RunboxMailBackend, JmapMailBackend
 */
export interface MailBackend {
    /**
     * Get list of mailboxes/folders
     */
    getMailboxes(): Observable<Mailbox[]>;

    /**
     * Create a new mailbox
     */
    createMailbox(name: string, parentId?: string): Observable<Mailbox>;

    /**
     * Rename a mailbox
     */
    renameMailbox(id: string, newName: string): Observable<void>;

    /**
     * Delete a mailbox
     */
    deleteMailbox(id: string): Observable<void>;

    /**
     * Move a mailbox to a new parent
     */
    moveMailbox(id: string, newParentId: string): Observable<void>;

    /**
     * Empty a mailbox (delete all messages)
     */
    emptyMailbox(id: string): Observable<void>;

    /**
     * Query emails with filtering/pagination
     */
    queryEmails(options: EmailQueryOptions): Observable<EmailHeader[]>;

    /**
     * Get full email content
     */
    getEmailContent(id: string): Observable<EmailContent>;

    /**
     * Get multiple email contents in batch.
     * Returns a map with entries for all requested IDs.
     * Value is null if the content could not be fetched (error or not found).
     */
    getEmailContents(ids: string[]): Observable<Map<string, EmailContent | null>>;

    /**
     * Get changes since last sync state
     */
    getChanges(sinceState: string): Observable<EmailChanges>;

    /**
     * Get deleted message IDs since a date.
     * Runbox-specific: JMAP backends should use getChanges() instead.
     * May throw if not supported by the backend.
     */
    getDeletedSince(sinceDate: Date): Observable<string[]>;

    /**
     * Move emails to a different mailbox
     */
    moveEmails(ids: string[], toMailboxId: string, fromMailboxId?: string): Observable<void>;

    /**
     * Delete emails (move to trash or permanently delete if already in trash)
     */
    deleteEmails(ids: string[]): Observable<void>;

    /**
     * Set email seen/read flag
     */
    setSeenFlag(id: string, seen: boolean): Observable<void>;

    /**
     * Set email flagged/starred flag
     */
    setFlaggedFlag(id: string, flagged: boolean): Observable<void>;

    /**
     * Save a draft
     */
    saveDraft(draft: DraftEmail): Observable<string>;

    /**
     * Send an email
     */
    sendEmail(draft: DraftEmail): Observable<void>;

    /**
     * Train spam filter
     */
    trainSpam(params: { is_spam: number; messages: number[] }): Observable<void>;

    /**
     * Allow sender (whitelist)
     */
    allowSender(email: string): Observable<void>;

    /**
     * Block sender
     */
    blockSender(email: string): Observable<void>;
}

export const MAIL_BACKEND = new InjectionToken<MailBackend>('MailBackend');
