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

import { TestBed } from '@angular/core/testing';
import { RecipientsService } from './recipients.service';
import { ContactsService } from '../contacts-app/contacts.service';
import { SearchService, XAPIAN_GLASS_WR } from '../xapian/searchservice';
import { StorageService } from '../storage.service';
import { AsyncSubject, of, Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import { Contact } from '../contacts-app/contact';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { MailAddressInfo } from '../common/mailaddressinfo';

const testcounter = 1;

export class MockSearchService {
    initSubject = new AsyncSubject<boolean>();
    mockedRecentMessages: number[] = [];
    mockedRecipients: { [messageId: number]: { recipients: string[] } } = {};
    indexReloadedSubject = new Subject<void>();

    api;

    constructor() {
        console.log('calling init');
        this.init();
    }

    init() {
        this.api = { termlist: () => {
            // Mock SearchService results into termlist:
            window['termlistresult'] = [
                MailAddressInfo.parse('TESTINGPERSON <test@example.com>')[0].nameAndAddress,
                MailAddressInfo.parse('"TESTINGG-PERSON" <test@example.com>')[0].nameAndAddress,
                MailAddressInfo.parse('TPERSON <test@example.com>')[0].nameAndAddress,
                MailAddressInfo.parse('TESTINGPERSON2 <test2@example.com>')[0].nameAndAddress,
                MailAddressInfo.parse('TEST5 <test5@example.com>')[0].nameAndAddress
            ];
        }};
        this.initSubject.next(true);
        this.initSubject.complete();
    }

    getMessagesInTimeRange(_start: Date, _end: Date, _folder?: string) {
        return this.mockedRecentMessages;
    }

    getDocData(id: number) {
        return this.mockedRecipients[id];
    }
}

export class ContactsServiceMock {
    public contactsSubject = of([
        new Contact({
            id: 5,
            nick: 'test',
            first_name: 'firstname',
            last_name: 'lastname',
            email: 'test@example.com'
        }),
        new Contact({
            id: 6,
            nick: 'test2',
            first_name: 'firstname2',
            last_name: 'lastname2',
            emails: [{ types: [], value: 'test2@example.com' }, { types: [], value: 'test4@example.com' }]
        })
    ]);
}

export class RunboxWebMailAPIMock {
    public me = of({ uid: 33 });
    public getProfiles = () => of([{ 'email':'testuser@runbox.com'}]);
    public getRunboxDomains = () => of([{ 'id': 1, name: 'runbox.com'}]);
}

describe('RecipientsService', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [],
            declarations: [ ], // declare the test component
            providers: [RecipientsService, StorageService,
                {provide: SearchService,    useClass: MockSearchService    },
                {provide: RunboxWebmailAPI, useClass: RunboxWebMailAPIMock },
                {provide: ContactsService,  useClass: ContactsServiceMock  },
            ]
        });
    });

    it('Should get recipients from contacts', async () => {
        const recipientsService = TestBed.inject(RecipientsService);

        // Take 2 as searchindex+contacts service are separate updates
        const recipients = await recipientsService.recipients.pipe(take(2)).toPromise();
        console.log(recipients);

        expect(window['termlistresult'].length).toBe(5);
        expect(window['termlistresult'].find(r => r === '"TESTINGPERSON" <test@example.com>')).toBeTruthy();

        expect(recipients.length).toBe(4);
        expect(recipients.find(r => r.toString().indexOf('test@example.com') > -1).toString())
            .toBe('"firstname lastname" <test@example.com>');
        expect(recipients.find(r => r.toString().indexOf('test2@example.com') > -1).toString())
            .toBe('"firstname2 lastname2" <test2@example.com>');
        expect(recipients.find(r => r.toString().indexOf('test5@example.com') > -1).toString())
            .toBe('"TEST5" <test5@example.com>');
        console.log('All expectations met');
    });

    it('Should suggest recent recipients', async () => {
        const searchMock: MockSearchService = <MockSearchService><unknown>TestBed.inject(SearchService);

        searchMock.mockedRecentMessages = [101, 102];
        searchMock.mockedRecipients = {
            101: { recipients: ['paul@company.com']    },
            102: { recipients: ['susan@elsewhere.net'] },
            103: { recipients: ['testuser@runbox.com'] }, // own address should be skipped
        };

        const recipientsService: RecipientsService = TestBed.inject(RecipientsService);
        const suggested = await recipientsService.recentlyUsed.pipe(take(1)).toPromise();

        expect(suggested.length).toBe(2);
    });
});
