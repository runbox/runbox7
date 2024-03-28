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
import { MatLegacyCheckboxChange as MatCheckboxChange } from '@angular/material/legacy-checkbox';

import { MailAddressInfo } from 'runbox-searchindex/mailaddressinfo';
import moment from 'moment';

import { Contact } from '../contacts-app/contact';
import { SearchService, SearchIndexDocumentData } from '../xapian/searchservice';
import { isValidEmail } from '../compose/emailvalidator';
import { filter, take } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { ProfileService } from '../profiles/profile.service';
import { UsageReportsService } from '../common/usage-reports.service';

export interface ContactHilights {
    icon: string;
    name: string;
    contact?: Contact;
    emails: SearchIndexDocumentData[];
    shownEmails?: number;
}

enum TimeSpan {
    TODAY,
    YESTERDAY,
    LASTWEEK,
    LASTMONTH,
    LASTYEAR,
    CUSTOM,
}

enum FolderSelection {
    ALL,
    INBOX,
    CUSTOM,
}

enum SortOrder {
    COUNT,
    SENDER,
}

interface FolderSelectorEntry {
    name:  string;
    count: number;
    shown: boolean;
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
    emailsShownPerName = new Map<string, number>();

    // exposing enums to the template
    TimeSpan = TimeSpan;
    FolderSelection = FolderSelection;
    SortOrder = SortOrder;

    // TODO: from appsettings or such?
    unreadOnly = true;
    timeSpan = TimeSpan.TODAY;
    folder = FolderSelection.INBOX;
    sortOrder = SortOrder.COUNT;

    // for the folder message selector.
    // We store the number of currently available messages in each folder,
    // as well as the set of folders explicitely hidden (they're all shown by default).
    folderMessages: Map<string, number> = new Map();
    hiddenFolders = new Set<string>();
    // a pre-calculated set of values for the folder selector, so that the angular template
    // doesn't have to do too much too often
    folderSelectorSwitches: FolderSelectorEntry[] = [];

    totalEmailCount = 0;
    regularEmailCount = 0;
    mailingListEmailCount = 0;

    constructor(
        private cdr: ChangeDetectorRef,
        private searchService: SearchService,
        private profileService: ProfileService,
        private usage: UsageReportsService,
    ) { }

    ngOnInit() {
        this.usage.report('overview-desk');
        this.profileService.validProfiles.subscribe(
            froms => this.ownAddresses.next(new Set(froms.map(f => f.email.toLowerCase()))),
            _err  => this.ownAddresses.next(new Set([])),
        );
        this.searchService.initSubject.pipe(filter(enabled => enabled)).subscribe(() => this.updateCommsOverview());
        this.searchService.indexReloadedSubject.subscribe(() => this.updateCommsOverview());
    }

    public async updateCommsOverview(): Promise<void> {
        const dateRange = this.dateRange();
        const folderMessages = new Map<string, number>();
        const messages = this.searchService.getMessagesInTimeRange(
            dateRange[0], dateRange[1]
        ).map(
            id => this.searchService.getDocData(id)
        ).filter(
            msg => !this.unreadOnly || !msg.seen
        ).filter(
            msg => msg.folder !== 'Sent'
        ).filter(
            msg => {
                const folderMessageCount = folderMessages.get(msg.folder) || 0;
                folderMessages.set(msg.folder, folderMessageCount + 1);
                switch (this.folder) {
                    case FolderSelection.ALL:
                        return true;
                    case FolderSelection.INBOX:
                        return msg.folder.match(/^Inbox|INBOX$/g);
                    case FolderSelection.CUSTOM:
                        return !this.hiddenFolders.has(msg.folder);
                }
            }
        );
        this.folderMessages = folderMessages;
        this.updateFolderSelectorSwitches();

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
                    shownEmails: this.emailsShownPerName.get(sender),
                };
            }
        );

        this.mailingListOverview = Array.from(messagesFromLists.keys()).map(
            ml => {
                return {
                    icon:   'list',
                    name:   ml,
                    emails: messagesFromLists.get(ml),
                    shownEmails: this.emailsShownPerName.get(ml),
                };
            }
        );

        this.regularOverview.sort((a, b) => {
            switch (this.sortOrder) {
                case SortOrder.COUNT:
                    return b.emails.length - a.emails.length;
                case SortOrder.SENDER:
                    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            }
        });

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
            if (!message.recipients.find(r => ownAddresses.has(r.toLowerCase()))) {
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

    public showMoreFor(sender: ContactHilights) {
        this.emailsShownPerName.set(sender.name, sender.emails.length);
        this.updateCommsOverview();
    }

    public showLessFor(sender: ContactHilights) {
        this.emailsShownPerName.delete(sender.name);
        this.updateCommsOverview();
    }

    public toggleFolderVisibility(folderName: string, event: MatCheckboxChange) {
        if (event.checked) {
            this.hiddenFolders.delete(folderName);
        } else {
            this.hiddenFolders.add(folderName);
        }
        // TODO: persist hiddenFolders in settings or something
        this.updateCommsOverview();
    }

    public dateRange(): Date[] {
        switch (this.timeSpan) {
            case TimeSpan.TODAY:
                return [new Date(), null];
            case TimeSpan.YESTERDAY:
                return [moment().subtract(1, 'day').toDate(), new Date()];
            case TimeSpan.LASTWEEK:
                return [moment().subtract(1, 'week').toDate(), null];
            case TimeSpan.LASTMONTH:
                return [moment().subtract(1, 'month').toDate(), null];
            case TimeSpan.LASTYEAR:
                return [moment().subtract(1, 'year').toDate(), null];
            case TimeSpan.CUSTOM:
                return [new Date(), null];
        }
    }

    private updateFolderSelectorSwitches() {
        this.folderSelectorSwitches = [];
        for (const folder of Array.from(this.folderMessages.keys()).sort()) {
            this.folderSelectorSwitches.push({
                name:  folder,
                count: this.folderMessages.get(folder),
                shown: !this.hiddenFolders.has(folder),
            });
        }
    }
}
