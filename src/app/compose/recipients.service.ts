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
import { isValidEmail } from './emailvalidator';
import { MailAddressInfo } from '../xapian/messageinfo';
import { Recipient } from './recipient';

@Injectable()
export class RecipientsService {
    recipients: ReplaySubject<Recipient[]> = new ReplaySubject();

    constructor(
        searchService: SearchService,
        contactsService: ContactsService
    ) {
        searchService.initSubject.subscribe((hasSearchIndex: boolean) => {

            const recipientsMap: {[email: string]: Recipient} = {};
            if (hasSearchIndex) {
                // Get all recipient terms from search index
                window['termlistresult'] = [];
                searchService.api.termlist('XRECIPIENT:');

                // Filter valid emails

                window['termlistresult']
                    .filter(recipient => isValidEmail(recipient))
                    .map(recipient => MailAddressInfo.parse(recipient)[0])
                    .forEach(recipient => {
                        recipientsMap[recipient.address] = Recipient.fromSearchIndex(recipient.nameAndAddress);
                    });

            }

            contactsService.contactsSubject.subscribe(contacts => {
                const groups = {};
                contacts.forEach(contact => {
                    contact.emails.forEach(email => {
                        const recipientString = `"${contact.full_name()}" <${email.value}>`;
                        recipientsMap[email.value] = Recipient.fromContact(contact, email.value);
                    });

                    contact.categories.forEach(group => {
                        if (!groups[group]) {
                            groups[group] = [];
                        }
                        groups[group].push(contact);
                    });
                });

                const result = Object.keys(recipientsMap).map(mailaddr => recipientsMap[mailaddr]);

                for (const group of Object.keys(groups)) {
                    result.unshift(Recipient.fromGroup(group, groups[group]));
                }

                this.recipients.next(result);
            });
        });
    }
}
