// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2026 Runbox Solutions AS (runbox.com).
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

import { Address, AddressDetails, Contact } from './contact';
import { ContactListComponent } from './contact-list.component';

describe('ContactListComponent', () => {
    let component: ContactListComponent;

    beforeEach(() => {
        component = new ContactListComponent();
        component.contacts = [
            new Contact({
                id: 'alice-id',
                first_name: 'Alice',
                last_name: 'Able',
                emails: [
                    { types: ['home'], value: 'alice@example.com' },
                    { types: ['work'], value: 'a.able@runbox.test' },
                ],
                phones: [
                    { types: ['cell'], value: '+47 555 0100' },
                ],
                categories: ['Friends'],
                note: 'Met at the storage migration planning session',
            }),
            new Contact({
                id: 'bob-id',
                first_name: 'Bob',
                last_name: 'Baker',
                emails: [
                    { types: ['work'], value: 'bob@example.com' },
                ],
                company: 'Example Logistics',
                department: 'Billing',
                categories: ['Team'],
            }),
        ];
        component.contacts[0].addresses = [
            new Address(
                ['work'],
                new AddressDetails(['', '', 'Search Street 7', 'Oslo', 'Viken', '0123', 'Norway'])
            ),
        ];
    });

    function shownContactIds(): string[] {
        return component.shownContacts.map(c => c.id);
    }

    it('searches email, phone, address, and note fields', () => {
        component.searchTerm = 'a.able@runbox.test';
        component.filterContacts();
        expect(shownContactIds()).toEqual(['alice-id']);

        component.searchTerm = '555 0100';
        component.filterContacts();
        expect(shownContactIds()).toEqual(['alice-id']);

        component.searchTerm = 'search street';
        component.filterContacts();
        expect(shownContactIds()).toEqual(['alice-id']);

        component.searchTerm = 'storage migration';
        component.filterContacts();
        expect(shownContactIds()).toEqual(['alice-id']);
    });

    it('searches company and department fields', () => {
        component.searchTerm = 'example logistics';
        component.filterContacts();
        expect(shownContactIds()).toEqual(['bob-id']);

        component.searchTerm = 'billing';
        component.filterContacts();
        expect(shownContactIds()).toEqual(['bob-id']);
    });

    it('keeps category filtering when searching non-name fields', () => {
        component.categoryFilter = 'USER:Team';
        component.searchTerm = 'a.able@runbox.test';

        component.filterContacts();

        expect(shownContactIds()).toEqual([]);
    });
});
