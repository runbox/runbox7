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
import { AsyncSubject } from 'rxjs';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { SearchService } from '../xapian/searchservice';
import { isValidEmail } from './emailvalidator';
import { MailAddressInfo } from '../xapian/messageinfo';

@Injectable()
export class RecipientsService {
    recipients: AsyncSubject<string[]> = new AsyncSubject();

    constructor(
        searchService: SearchService,
        rmmapi: RunboxWebmailAPI
    ) {
        searchService.initSubject.subscribe((hasSearchIndex: boolean) => {

            const recipientsMap: {[email: string]: string} = {};
            if (hasSearchIndex) {
                // Get all recipient terms from search index
                window['termlistresult'] = [];
                searchService.api.termlist('XRECIPIENT:');

                // Filter valid emails

                window['termlistresult']
                    .filter(recipient => isValidEmail(recipient))
                    .map(recipient => MailAddressInfo.parse(recipient)[0])
                    .forEach(recipient => {
                        recipientsMap[recipient.address] = recipient.nameAndAddress;
                    });

            }

            rmmapi.getAllContacts().subscribe(contacts => {
                contacts.forEach(contact => {
                    contact.emails.forEach(email => {
                        const recipientString = `"${contact.full_name()}" <${email.value}>`;
                        recipientsMap[email.value] = recipientString;
                    });
                });

                this.recipients.next(Object.keys(recipientsMap).map(mailaddr => recipientsMap[mailaddr]));
                this.recipients.complete();
            });
        });
    }
}
