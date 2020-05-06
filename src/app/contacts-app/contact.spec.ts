// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2018 Runbox Solutions AS (runbox.com).
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

import { Contact } from './contact';

describe('Contact', () => {
    it('cannot create contact with no name', () => {
        const sut = new Contact({});
        expect(() => sut.vcard()).toThrow();
    });

    it('can create contact with a name', () => {
        const sut = new Contact({});
        sut.nickname = 'Peter Pan';
        expect(() => sut.vcard()).not.toThrow();
        expect(sut.vcard()).toContain('FN');
    });

    it('can set first name for contact', () => {
        let sut = new Contact({});
        sut.first_name = 'Peter';
        expect(() => sut.vcard()).not.toThrow();

        sut = Contact.fromVcard(null, sut.vcard());
        expect(sut.first_name).toBe('Peter');
    });

    it('can set first and last name for contact', () => {
        let sut = new Contact({});
        sut.first_name = 'Peter';
        sut.last_name = 'Pan';
        expect(() => sut.vcard()).not.toThrow();

        sut = Contact.fromVcard(null, sut.vcard());
        expect(sut.first_name).toBe('Peter');
        expect(sut.last_name).toBe('Pan');
    });

    it('can set emails for contact', () => {
        const sut = new Contact({});
        sut.first_name = 'Peter';
        sut.emails = [ { types: [], value: 'test2@example.com' }, { types: ['work'], value: 'test4@example.com'} ];
        expect(() => sut.vcard()).not.toThrow();
        expect(sut.vcard()).toContain('EMAIL:');
    });

    it('can parse contact from a nextcloud-produced vcard', () => {
        // produced with Nextcloud 19 contacts
        const vcard = `BEGIN:VCARD
VERSION:3.0
PRODID:-//Sabre//Sabre VObject 4.1.6//EN
UID:fc45f01b-5afe-43b6-b6d8-9d4768d94142
REV;VALUE=DATE-AND-OR-TIME:20200424T100036Z
FN:Full name
ADR;TYPE=HOME:;;;;;;
EMAIL;TYPE=HOME:
TEL;TYPE="HOME,VOICE":
ORG:Company
TITLE:Title
N:Last;First;Middle;Dr;The Great
END:VCARD`;
        const sut = Contact.fromVcard(null, vcard);
        expect(sut.first_name).toBe('First');
        expect(sut.last_name).toBe('Last');
        expect(sut.company).toBe('Company');
    });

    it('can parse ADR property', () => {
        const vcard = `BEGIN:VCARD
VERSION:3.0
PRODID:-//Sabre//Sabre VObject 4.1.6//EN
UID:3e65dced-9784-49ea-b9d7-9aac66c00f99
REV;VALUE=DATE-AND-OR-TIME:20200424T110821Z
FN:Addressman
ADR;TYPE=HOME:pobox 123;;foo street 13;Townsville;Centralia;12-345;Contactia
EMAIL;TYPE=HOME:
TEL;TYPE="HOME,VOICE":
END:VCARD`;
        const sut = Contact.fromVcard(null, vcard);
        const addresses = sut.addresses;
        expect(addresses.length).toBe(1);
        expect(addresses[0].value.street).toBe('foo street 13');
        expect(addresses[0].value.city).toBe('Townsville');
        expect(addresses[0].value.region).toBe('Centralia');
        expect(addresses[0].value.post_code).toBe('12-345');
        expect(addresses[0].value.country).toBe('Contactia');
    });

    it('can set categories for contact', () => {
        let sut = new Contact({});
        sut.first_name = 'Peter';
        sut.categories = ['test'];
        expect(() => sut.vcard()).not.toThrow();

        sut = Contact.fromVcard(null, sut.vcard());
        expect(sut.categories.length).toBe(1);
        expect(sut.categories[0]).toBe('test');
    });

});
