// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2019 Runbox Solutions AS (runbox.com).
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
import { ReplaySubject } from 'rxjs';
import { SearchService } from '../xapian/searchservice';
import { ContactsService } from '../contacts-app/contacts.service';
import { ContactKind, Contact } from '../contacts-app/contact';
import { isValidEmail } from './emailvalidator';
import { MailAddressInfo } from '../common/mailaddressinfo';
import { Recipient } from './recipient';
import { ProfileService } from '../profiles/profile.service';
import moment from 'moment';

enum RecipientOrigin {
    Search = 'search',
    Contacts = 'contacts',
}

@Injectable()
export class RecipientsService {
    ownAddresses: ReplaySubject<Set<string>> = new ReplaySubject(1);
    recipients: ReplaySubject<Recipient[]> = new ReplaySubject();
    recentlyUsed: ReplaySubject<MailAddressInfo[]> = new ReplaySubject(1);

    // Need to be able to update from 2 different subscriptions
    recipientsUpdating: { origin: RecipientOrigin, uniqueKey: string, recipient: Recipient }[] = [];

    constructor(
        private searchService: SearchService,
        private contactsService: ContactsService,
        profileService: ProfileService
    ) {
        profileService.validProfiles.subscribe(
            froms => this.ownAddresses.next(new Set(froms.map(f => f.email))),
            _err  => this.ownAddresses.next(new Set([])),
        );

        searchService.initSubject.subscribe((hasSearchIndex: boolean) => {
            if (hasSearchIndex) {
                this.recipientsUpdating = this.recipientsUpdating.filter(r => r.origin !== RecipientOrigin.Search);

                // Get all recipient terms from search index
                window['termlistresult'] = [];
                searchService.api.termlist('XRECIPIENT:');

                // Filter valid emails

                window['termlistresult']
                    .filter(recipient => isValidEmail(recipient))
                    .map(recipient => MailAddressInfo.parse(recipient)[0])
                    .forEach(recipient => {
                        this.recipientsUpdating.push({
                            'origin': RecipientOrigin.Search,
                            'uniqueKey': recipient.address,
                            'recipient': Recipient.fromSearchIndex(recipient.nameAndAddress)
                        });
                    });
                console.debug(this.recipientsUpdating.length, 'recipients loaded from search index');

                this.updateRecentlyUsed();
                this.updateRecipients();
            }
        });

        searchService.indexReloadedSubject.subscribe(() => this.updateRecentlyUsed());

        contactsService.contactsSubject.subscribe(contacts => {
            this.recipientsUpdating = this.recipientsUpdating.filter(r => r.origin !== RecipientOrigin.Contacts);

            const categories = {};
            const groups     = [];
            contacts.forEach(contact => {
                if (contact.kind === ContactKind.GROUP) {
                    groups.push(contact);
                    return;
                }

                contact.emails.forEach(email => {
                    this.recipientsUpdating.push({
                        'origin': RecipientOrigin.Contacts,
                        'uniqueKey': email.value,
                        'recipient': Recipient.fromContact(contact, email.value)
                    });
                });

                contact.categories.forEach(category => {
                    if (!categories[category]) {
                        categories[category] = [];
                    }
                    categories[category].push(contact);
                });
            });

            for (const category of Object.keys(categories)) {
                this.recipientsUpdating.push({
                    'origin': RecipientOrigin.Contacts,
                    'uniqueKey': category,
                    'recipient': Recipient.fromCategory(category, categories[category])});
            }

            Promise.all(
                groups.map(g => this.recipientFromGroup(g))
            ).then((updateGroups) => {
                this.updateRecipients(updateGroups);
            }).catch(
                () => this.recipients.next([])
            );
        });

        this.recipients.subscribe(recipients => console.debug(recipients.length, 'recipients ready to use'));
    }

    private updateRecipients(groups: Recipient[] = []) {
        const uniqueRecipients: {[uniqueKey: string]: Recipient} = {};
        this.recipientsUpdating.forEach(entry => {
            if (!uniqueRecipients[entry['uniqueKey']] ||
                entry['origin'] === RecipientOrigin.Contacts) {
                uniqueRecipients[entry['uniqueKey']] = entry['recipient'];
            }
        });
        this.recipients.next(Object.values(uniqueRecipients).concat(groups));
    }

    private updateRecentlyUsed() {
        const startDate = moment().subtract(90, 'days');
        const endDate = moment().add(1, 'day');
        const latestEmails = this.searchService.getMessagesInTimeRange(startDate.toDate(), endDate.toDate(), 'Sent');
        const popularRecipients: { [email: string]: number } = {};
        const addressInfoByEmail: { [email: string]: MailAddressInfo } = {};

        for (const id of latestEmails) {
            const message = this.searchService.getDocData(id);
            for (const recipient of message.recipients) {
                if (!isValidEmail(recipient)) {
                    continue;
                }

                const mai = MailAddressInfo.parse(recipient)[0];
                const email = mai.address;
                if (popularRecipients[email]) {
                    popularRecipients[email]++;
                } else {
                    popularRecipients[email] = 1;
                }

                // newest known name wins
                if (!addressInfoByEmail[email] || !addressInfoByEmail[email].name) {
                    addressInfoByEmail[email] = mai;
                }
            }
        }

        this.ownAddresses.subscribe(own => {
            this.recentlyUsed.next(
                Object.entries(
                    popularRecipients
                ).filter(
                    x => !own.has(x[0])
                ).sort(
                    (a, b) => b[1] - a[1]
                ).map(
                    a => addressInfoByEmail[a[0]]
                )
            );
        });
    }

    private recipientFromGroup(group: Contact): Promise<Recipient> {
        const promises = [];

        for (const m of group.members) {
            if (m.uuid) {
                promises.push(
                    this.contactsService.lookupByUUID(m.uuid).then(
                        (c: Contact) => {
                            if (c.primary_email()) {
                                return `"${c.external_display_name()}" <${c.primary_email()}>`;
                            } else {
                                return null;
                            }
                        }
                    ).catch(
                        () => null
                    )
                );
            } else if (m.email) {
                if (m.name) {
                    promises.push(Promise.resolve(`${m.name} <${m.email}>`));
                } else {
                    promises.push(Promise.resolve(m.email));
                }
            }
        }

        return Promise.all(promises).then(
            members => {
                const recipients = members.filter(r => !!r);
                return new Recipient(recipients, `"${group.full_name}" group (${recipients.length} contacts)`);
            }
        );
    }
}
