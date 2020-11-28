// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2020 Runbox Solutions AS (runbox.com).
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

import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { MatCheckboxChange } from '@angular/material/checkbox';

import { MailAddressInfo } from 'runbox-searchindex/mailaddressinfo';
import * as moment from 'moment';

import { Contact } from '../contacts-app/contact';
import { SearchService, SearchIndexDocumentData } from '../xapian/searchservice';
import { isValidEmail } from '../compose/emailvalidator';
import { filter, take } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import {MatSelectChange} from '@angular/material/select';

interface ContactHilights {
    icon: string;
    name: string;
    contact?: Contact;
    emails: SearchIndexDocumentData[];
}

enum TimeSpan {
    TODAY,
    YESTERDAY,
    LAST3,
    LAST7,
    CUSTOM,
}

@Component({
    selector: 'app-start',
    templateUrl: './startdesk.component.html',
    styleUrls: ['./startdesk.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StartDeskComponent implements OnInit {
    ownAddresses: ReplaySubject<Set<string>> = new ReplaySubject(1);

    regularOverview: ContactHilights[] = [];
    mailingListOverview: ContactHilights[] = [];

    TimeSpan = TimeSpan; // exposing enum to the template
    // TODO: from appsettings or such?
    unreadOnly = false;
    timeSpan = TimeSpan.TODAY;

    totalEmailCount = 0;
    regularEmailCount = 0;
    mailingListEmailCount = 0;

    constructor(
        private cdr: ChangeDetectorRef,
        private searchService: SearchService,
        private rmmapi: RunboxWebmailAPI,
    ) { }

    ngOnInit() {
        this.rmmapi.getFromAddress().subscribe(
            froms => this.ownAddresses.next(new Set(froms.map(f => f.email))),
            _err  => this.ownAddresses.next(new Set([])),
        );
        this.searchService.initSubject.pipe(filter(enabled => enabled)).subscribe(() => this.updateCommsOverview());
        this.searchService.searchResultsSubject.subscribe(() => this.updateCommsOverview());
    }

    private async updateCommsOverview(): Promise<void> {
        const dateRange = this.dateRange();
        const messages = this.searchService.getMessagesInTimeRange(
            dateRange[0], dateRange[1]
        ).map(
            id => this.searchService.getDocData(id)
        ).filter(
            msg => !this.unreadOnly || !msg.seen
        ).filter(
            msg => msg.folder !== 'Sent'
        );

        // Ideally, we'll obtain a list of mailing lists from List-ID across the entirety of search index
        // We don't have that luxury currently, so this hack will have to do
        const mailingLists = await this.extractMailingLists(messages);
        const mailingListOf = (msg: SearchIndexDocumentData): string => {
            const mls = Array.from(mailingLists.values());
            for (const rec of msg.recipients) {
                for (const ml of mls) {
                    if (rec.includes(ml)) {
                        return ml;
                    }
                }
            }
            return null;
        };

        const messagesFromLists = new Map<string, SearchIndexDocumentData[]>();
        const otherMessages = [];
        for (const msg of messages) {
            const ml = mailingListOf(msg);
            if (ml) {
                const mlMessages = messagesFromLists.get(ml) || [];
                mlMessages.push(msg);
                messagesFromLists.set(ml, mlMessages);
            } else {
                otherMessages.push(msg);
            }
        }

        const messagesBySender = this.groupMessagesBySender(otherMessages);

        this.regularOverview = Object.keys(messagesBySender).map(
            sender => {
                return {
                    icon:  'person',
                    name:   sender,
                    emails: messagesBySender[sender],
                };
            }
        );

        this.mailingListOverview = Array.from(messagesFromLists.keys()).map(
            ml => {
                return {
                    icon:   'list',
                    name:   ml,
                    emails: messagesFromLists.get(ml),
                };
            }
        );

        this.totalEmailCount = messages.length;
        this.regularEmailCount = otherMessages.length;
        this.mailingListEmailCount = messages.length - otherMessages.length;

        this.cdr.detectChanges();
    }

    public emailPath(email: SearchIndexDocumentData): string {
        const folderPath = email.folder.replace(/\./, '/');
        const id = email.id.slice(1);
        return `${folderPath}:${id}`;
    }

    private emailOf(mailAddressLine: string): string {
        if (isValidEmail(mailAddressLine)) {
            const mai = MailAddressInfo.parse(mailAddressLine)[0];
            return mai.address;
        }
        return null;
    }

    private groupMessagesBySender(messages: SearchIndexDocumentData[]): { [email: string]: SearchIndexDocumentData[] } {
        const messagesBySender: { [email: string]: SearchIndexDocumentData[] } = {};
        const addressInfoByEmail: { [email: string]: MailAddressInfo } = {};

        for (const message of messages) {
            let sender: string;
            if (isValidEmail(message.from)) {
                const mai = MailAddressInfo.parse(message.from)[0];
                const email = mai.address;

                // newest known name wins
                if (!addressInfoByEmail[email] || !addressInfoByEmail[email].name) {
                    addressInfoByEmail[email] = mai;
                }
                sender = email;
            } else {
                sender = message.from;
            }

            if (!messagesBySender[sender]) {
                messagesBySender[sender] = [];
            }
            messagesBySender[sender].push(message);
        }

        const messagesBySenderNamed: { [email: string]: SearchIndexDocumentData[] } = {};
        for (const sender of Object.keys(messagesBySender)) {
            const senderName = addressInfoByEmail[sender]?.name || sender;
            let senderMessages = messagesBySenderNamed[senderName] || [];
            senderMessages = senderMessages.concat(messagesBySender[sender]);
            messagesBySenderNamed[senderName] = senderMessages;
        }

        return messagesBySenderNamed;
    }

    private async extractMailingLists(messages: SearchIndexDocumentData[]): Promise<Set<string>> {
        const possibleMailingLists = new Map<string, number>();
        const ownAddresses = await this.ownAddresses.pipe(take(1)).toPromise();

        for (const message of messages) {
            if (!message.recipients.find(r => ownAddresses.has(r))) {
                for (const recipient of message.recipients) {
                    const recId = this.emailOf(recipient) || recipient;
                    let occurences = possibleMailingLists.get(recId) || 0;
                    occurences++;
                    possibleMailingLists.set(recId, occurences);
                }
            }
        }

        const mailingLists = new Set<string>();
        for (const [ml, popularity] of Array.from(possibleMailingLists.entries())) {
            if (popularity > 1) {
                mailingLists.add(ml);
            }
        }

        return mailingLists;
    }

    public toggleUnreadOnly(event: MatCheckboxChange) {
        this.unreadOnly = event.checked;
        this.updateCommsOverview();
    }

    public changeTimeSpan(event: MatSelectChange) {
        this.timeSpan = event.value;
        this.updateCommsOverview();
    }

    public dateRange(): Date[] {
        switch (this.timeSpan) {
            case TimeSpan.TODAY:
                return [new Date(), null];
            case TimeSpan.YESTERDAY:
                return [moment().subtract(1, 'day').toDate(), new Date()];
            case TimeSpan.LAST3:
                return [moment().subtract(2, 'day').toDate(), null];
            case TimeSpan.LAST7:
                return [moment().subtract(6, 'day').toDate(), null];
            case TimeSpan.CUSTOM:
                return [new Date(), null];
        }
    }
}
