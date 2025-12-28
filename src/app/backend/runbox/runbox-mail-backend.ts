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
import { Observable, from, of, throwError } from 'rxjs';
import { map, mergeMap, catchError, toArray, tap } from 'rxjs/operators';

/** Maximum parallel requests for batch email content fetching */
const MAX_PARALLEL_REQUESTS = 5;

import {
    MailBackend,
    Mailbox,
    EmailHeader,
    EmailContent,
    EmailChanges,
    EmailQueryOptions,
    DraftEmail
} from '../mail-backend.interface';
import { RunboxWebmailAPI } from '../../rmmapi/rbwebmail';
import { FolderListEntry } from '../../common/folderlistentry';
import { MessageInfo } from '../../common/messageinfo';

/**
 * Runbox implementation of MailBackend.
 * Wraps the existing RunboxWebmailAPI.
 */
@Injectable({
    providedIn: 'root'
})
export class RunboxMailBackend implements MailBackend {
    private mailboxPathToId = new Map<string, string>();
    private mailboxIdToPath = new Map<string, string>();

    constructor(private api: RunboxWebmailAPI) {}

    getMailboxes(): Observable<Mailbox[]> {
        return this.api.getFolderList().pipe(
            map((folders: FolderListEntry[]) =>
                folders.map(f => this.folderToMailbox(f))
            ),
            tap(mailboxes => this.updateMailboxCache(mailboxes))
        );
    }

    createMailbox(name: string, parentId?: string): Observable<Mailbox> {
        const parentIdNum = parentId ? parseInt(parentId, 10) : 0;

        // First get current mailboxes to find parent path if needed
        return this.getMailboxes().pipe(
            mergeMap(currentMailboxes => {
                let expectedPath = name;

                if (parentId) {
                    const parent = currentMailboxes.find(m => m.id === parentId);
                    if (!parent) {
                        // Fail fast if parent is specified but not found
                        return throwError(() => new Error(`Parent mailbox not found: ${parentId}`));
                    }
                    expectedPath = `${parent.path}.${name}`;
                }

                return this.api.createFolder(parentIdNum, name, []).pipe(
                    mergeMap(() => this.getMailboxes()),
                    mergeMap(mailboxes => {
                        // Find by path (unique) instead of just name
                        const created = mailboxes.find(m => m.path === expectedPath);
                        if (!created) {
                            return throwError(() => new Error(`Failed to find created mailbox at path: ${expectedPath}`));
                        }
                        return [created];
                    })
                );
            })
        );
    }

    renameMailbox(id: string, newName: string): Observable<void> {
        return this.api.renameFolder(parseInt(id, 10), newName).pipe(
            map(() => undefined)
        );
    }

    deleteMailbox(id: string): Observable<void> {
        return this.api.deleteFolder(parseInt(id, 10)).pipe(
            map(() => undefined)
        );
    }

    moveMailbox(id: string, newParentId: string): Observable<void> {
        return this.api.moveFolder(parseInt(id, 10), parseInt(newParentId, 10)).pipe(
            map(() => undefined)
        );
    }

    emptyMailbox(id: string): Observable<void> {
        return this.api.emptyFolder(parseInt(id, 10)).pipe(
            map(() => undefined)
        );
    }

    queryEmails(options: EmailQueryOptions): Observable<EmailHeader[]> {
        const page = options.offset ? Math.floor(options.offset / (options.limit || 100)) : 0;
        const sinceId = options.sinceId || 0;
        const sinceChangedDate = options.sinceChangedDate?.getTime() || 0;
        const pageSize = options.limit || 100;

        // Support both mailboxPath and mailboxId (map ID to path for Runbox API)
        const mailboxPath = options.mailboxPath
            || (options.mailboxId ? this.mailboxIdToPath.get(options.mailboxId) : undefined);

        return this.api.listAllMessages(
            page,
            sinceId,
            sinceChangedDate,
            pageSize,
            !options.includeContent,
            mailboxPath
        ).pipe(
            map((messages: MessageInfo[]) =>
                messages.map(m => this.messageInfoToEmailHeader(m))
            )
        );
    }

    getEmailContent(id: string): Observable<EmailContent> {
        return this.api.getMessageContents(parseInt(id, 10)).pipe(
            map(content => ({
                id,
                textBody: content.text?.text,
                htmlBody: content.text?.html,
                attachments: []
            }))
        );
    }

    getEmailContents(ids: string[]): Observable<Map<string, EmailContent | null>> {
        if (ids.length === 0) {
            return of(new Map<string, EmailContent | null>());
        }

        // Filter valid numeric IDs and track invalid ones
        // Use strict numeric check to reject partial matches like "123abc"
        const validIds: { id: string; numericId: number }[] = [];
        const invalidIds: string[] = [];
        const numericPattern = /^\d+$/;

        for (const id of ids) {
            if (numericPattern.test(id)) {
                const numericId = parseInt(id, 10);
                if (numericId > 0) {
                    validIds.push({ id, numericId });
                } else {
                    invalidIds.push(id);
                }
            } else {
                invalidIds.push(id);
            }
        }

        if (validIds.length === 0) {
            // All IDs were invalid - return map with nulls
            const resultMap = new Map<string, EmailContent | null>();
            for (const id of invalidIds) {
                resultMap.set(id, null);
            }
            return of(resultMap);
        }

        // Fetch messages with limited parallelism using mergeMap
        return from(validIds).pipe(
            mergeMap(
                ({ id, numericId }) =>
                    this.api.getMessageContents(numericId).pipe(
                        map(content => ({ id, content })),
                        catchError(() => of({ id, content: null }))
                    ),
                MAX_PARALLEL_REQUESTS
            ),
            toArray(),
            map(results => {
                const resultMap = new Map<string, EmailContent | null>();

                // Add entries for invalid IDs as null
                for (const id of invalidIds) {
                    resultMap.set(id, null);
                }

                // Add entries for all valid IDs (content or null on failure)
                for (const { id, content } of results) {
                    if (content) {
                        resultMap.set(id, {
                            id,
                            textBody: content.text?.text,
                            htmlBody: content.text?.html,
                            attachments: []
                        });
                    } else {
                        resultMap.set(id, null);
                    }
                }
                return resultMap;
            })
        );
    }

    getChanges(_sinceState: string): Observable<EmailChanges> {
        // Runbox doesn't support JMAP-style state-based sync.
        // Use queryEmails with sinceId/sinceChangedDate and getDeletedSince instead.
        return throwError(() => new Error(
            'getChanges is not supported by RunboxMailBackend. ' +
            'Use queryEmails with sinceId/sinceChangedDate and getDeletedSince instead.'
        ));
    }

    getDeletedSince(sinceDate: Date): Observable<string[]> {
        return this.api.listDeletedMessagesSince(sinceDate).pipe(
            map(ids => ids.map(id => String(id)))
        );
    }

    moveEmails(ids: string[], toMailboxId: string, fromMailboxId?: string): Observable<void> {
        const numericIds = ids.map(id => parseInt(id, 10));
        const toId = parseInt(toMailboxId, 10);
        const fromId = fromMailboxId ? parseInt(fromMailboxId, 10) : 0;

        return this.api.moveToFolder(numericIds, toId, fromId).pipe(
            map(() => undefined)
        );
    }

    deleteEmails(ids: string[]): Observable<void> {
        const numericIds = ids.map(id => parseInt(id, 10));
        return this.api.deleteMessages(numericIds).pipe(
            map(() => undefined)
        );
    }

    setSeenFlag(id: string, seen: boolean): Observable<void> {
        return this.api.markSeen(parseInt(id, 10), seen ? 1 : 0).pipe(
            map(() => undefined)
        );
    }

    setFlaggedFlag(id: string, flagged: boolean): Observable<void> {
        return this.api.markFlagged(parseInt(id, 10), flagged ? 1 : 0).pipe(
            map(() => undefined)
        );
    }

    saveDraft(draft: DraftEmail): Observable<string> {
        const draftModel = this.draftEmailToDraftModel(draft);
        return this.api.saveDraft(draftModel, false).pipe(
            map(result => result[1] || '')
        );
    }

    sendEmail(draft: DraftEmail): Observable<void> {
        const draftModel = this.draftEmailToDraftModel(draft);
        return this.api.saveDraft(draftModel, true).pipe(
            map(() => undefined)
        );
    }

    trainSpam(params: { is_spam: number; messages: number[] }): Observable<void> {
        return this.api.trainSpam(params).pipe(
            map(() => undefined)
        );
    }

    allowSender(email: string): Observable<void> {
        return this.api.allowSender(email).pipe(
            map(() => undefined)
        );
    }

    blockSender(email: string): Observable<void> {
        return this.api.blockSender(email).pipe(
            map(() => undefined)
        );
    }

    // Helper methods for data conversion

    private folderToMailbox(folder: FolderListEntry): Mailbox {
        return {
            id: String(folder.folderId),
            name: folder.folderName,
            path: folder.folderPath,
            parentId: folder.folderLevel > 0 ? undefined : undefined, // Would need parent tracking
            totalMessages: folder.totalMessages,
            unreadMessages: folder.newMessages,
            role: this.mapFolderType(folder.folderType),
            sortOrder: folder.priority
        };
    }

    private mapFolderType(type: string): string | undefined {
        const typeMap: Record<string, string> = {
            'inbox': 'inbox',
            'sent': 'sent',
            'drafts': 'drafts',
            'trash': 'trash',
            'spam': 'spam',
            'junk': 'spam'
        };
        return typeMap[type?.toLowerCase()] || undefined;
    }

    private messageInfoToEmailHeader(msg: MessageInfo): EmailHeader {
        const folder = msg.folder || '';
        const mailboxId = folder ? this.mailboxPathToId.get(folder) : undefined;
        return {
            id: String(msg.id),
            // Runbox: single mailbox per message, map folder path -> Mailbox.id
            mailboxIds: mailboxId ? [mailboxId] : [],
            mailboxPath: folder,
            threadId: undefined,
            subject: msg.subject || '',
            from: this.formatAddress(msg.from),
            to: this.formatAddress(msg.to),
            date: msg.messageDate || new Date(),
            size: msg.size || 0,
            seen: msg.seenFlag || false,
            flagged: msg.flaggedFlag || false,
            answered: msg.answeredFlag || false,
            hasAttachment: msg.attachment || false,
            preview: msg.plaintext
        };
    }

    private formatAddress(addr: unknown): string {
        if (typeof addr === 'string') {
            return addr;
        }
        if (Array.isArray(addr)) {
            return addr.map(a => {
                if (typeof a === 'object' && a !== null) {
                    const obj = a as { name?: string; address?: string };
                    return obj.name ? `${obj.name} <${obj.address}>` : obj.address || '';
                }
                return String(a);
            }).join(', ');
        }
        return '';
    }

    private draftEmailToDraftModel(draft: DraftEmail): any {
        return {
            mid: draft.id ? parseInt(draft.id, 10) : 0,
            from: draft.from,
            to: draft.to.map(addr => ({ nameAndAddress: addr })),
            cc: draft.cc?.map(addr => ({ nameAndAddress: addr })),
            bcc: draft.bcc?.map(addr => ({ nameAndAddress: addr })),
            subject: draft.subject,
            msg_body: draft.htmlBody || draft.textBody || '',
            useHTML: !!draft.htmlBody,
            in_reply_to: draft.inReplyTo,
            reply_to_id: draft.replyToId,
            attachments: draft.attachments?.map(a => ({ file: a })),
            tags: draft.tags
        };
    }

    private updateMailboxCache(mailboxes: Mailbox[]): void {
        this.mailboxPathToId.clear();
        this.mailboxIdToPath.clear();
        for (const mailbox of mailboxes) {
            if (mailbox.path) {
                this.mailboxPathToId.set(mailbox.path, mailbox.id);
            }
            this.mailboxIdToPath.set(mailbox.id, mailbox.path);
        }
    }
}
