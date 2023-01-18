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

import { Contact, ContactKind, Address, AddressDetails } from './contact';

describe('Contact', () => {
    it('can create contact with no name', () => {
        const sut = new Contact({});
        expect(() => sut.vcard()).not.toThrow();
    });

    it('can create contact with a name', () => {
        const sut = new Contact({});
        sut.nickname = 'Peter Pan';
        expect(() => sut.vcard()).not.toThrow();
        expect(sut.vcard()).toContain('FN');
    });

    it('can create contact with a no name, but a company', () => {
        const sut = new Contact({});
        sut.company = 'Runbox';
        expect(() => sut.vcard()).not.toThrow();
        expect(sut.vcard()).toContain('ORG');
        expect(sut.vcard()).toContain('ABSHOWAS');
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
        expect(addresses[0].types.length).toBe(1);
        expect(addresses[0].types[0].toLowerCase()).toBe('home');
        expect(addresses[0].value.street).toBe('foo street 13');
        expect(addresses[0].value.city).toBe('Townsville');
        expect(addresses[0].value.region).toBe('Centralia');
        expect(addresses[0].value.post_code).toBe('12-345');
        expect(addresses[0].value.country).toBe('Contactia');

        const phones = sut.phones;
        expect(phones.length).toBe(1);
        expect(phones[0].types.length).toBe(2);
        expect(phones[0].types[0].toLowerCase()).toBe('home');
        expect(phones[0].types[1].toLowerCase()).toBe('voice');
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

    it('can set address for contact', () => {
        const sut = new Contact({});
        sut.first_name = 'Peter';

        sut.addresses = [
            new Address(
                ['home'],
                new AddressDetails(['', '', 'test st.', 'testville', 'state', '12-345', 'liberia'])
            ),
        ];

        expect(() => sut.vcard()).not.toThrow();
        expect(sut.vcard()).toContain('ADR;TYPE=home:;;test');
    });

    it('contacts are individuals by default', () => {
        const sut = new Contact({});
        expect(sut.kind).toBe(ContactKind.INVIDIDUAL);
    });

    it('can create a group', () => {
        const sut = new Contact({});
        sut.full_name  = 'Neverland characters';
        sut.kind = ContactKind.GROUP;

        expect(() => sut.vcard()).not.toThrow();
        expect(sut.vcard()).toContain('FN:Neverland');
        expect(sut.vcard()).toContain('KIND:group');
    });

    it('can parse a 3.0 group', () => {
        const sut = Contact.fromVcard(null, `BEGIN:VCARD
VERSION:3.0
X-ADDRESSBOOKSERVER-KIND:GROUP
FN:Test Group
END:VCARD`);
        expect(sut.kind).toBe(ContactKind.GROUP);
    });

    it('can parse group members', () => {
        // based on https://tools.ietf.org/html/rfc6350#section-6.6.5
        const sut = Contact.fromVcard(null, `BEGIN:VCARD
VERSION:4.0
KIND:group
FN:The Doe family
MEMBER:03a0e51f-d1aa-4385-8a53-e29025acd8ae
MEMBER:urn:uuid:03a0e51f-d1aa-4385-8a53-e29025acd8af
MEMBER:mailto:subscriber1@example.com
MEMBER:xmpp:subscriber2@example.com
MEMBER:sip:subscriber3@example.com
MEMBER:tel:+1-418-555-5555
END:VCARD`);

        expect(sut.kind).toBe(ContactKind.GROUP);
        expect(sut.members.length).toBe(6);
        expect(sut.members[0].uuid).toBe('03a0e51f-d1aa-4385-8a53-e29025acd8ae');
        expect(sut.members[1].uuid).toBe('03a0e51f-d1aa-4385-8a53-e29025acd8af');
        expect(sut.members[2].uuid).toBe(null);
        expect(sut.members[2].scheme).toBe('mailto');
        expect(sut.members[2].value).toBe('subscriber1@example.com');
    });

    it('can make sense of extended member properties', () => {
        const sut = Contact.fromVcard(null, `BEGIN:VCARD
VERSION:4.0
KIND:group
MEMBER;X-CN=Jamie:mailto:jamie@me.me
MEMBER;X-EMAIL=sybil@syb.il;X-CN=Sybilla:urn:uuid:f00d
END:VCARD`);
        expect(sut.kind).toBe(ContactKind.GROUP);
        expect(sut.members.length).toBe(2);

        expect(sut.members[0].uuid).toBe(null);
        expect(sut.members[0].name).toBe('Jamie');
        expect(sut.members[0].email).toBe('jamie@me.me');

        expect(sut.members[1].uuid).toBe('f00d');
        expect(sut.members[1].name).toBe('Sybilla');
        expect(sut.members[1].email).toBe('sybil@syb.il');
    });

    it('can parse org and department correctly', () => {
        let sut = Contact.fromVcard(null, `BEGIN:VCARD
VERSION:3.0
FN:testcontact
ORG:company;department
END:VCARD`);

        expect(sut.company).toBe('company');
        expect(sut.department).toBe('department');

        sut = Contact.fromVcard(null, `BEGIN:VCARD
VERSION:3.0
FN:testcontact
ORG:runbox
END:VCARD`);

        expect(sut.company).toBe('runbox');
        expect(sut.department).toBeFalsy();
    });

    it('can parse company with no name fields', () => {
        const sut = Contact.fromVcard(null, `BEGIN:VCARD
VERSION:3.0
ORG:company;department
END:VCARD`);

        expect(sut.company).toBe('company');
        expect(sut.department).toBe('department');
    });

    it('can parse grouped properties', () => {
        const sut = Contact.fromVcard(null, `BEGIN:VCARD
VERSION:3.0
FN:testcontact
item1.ADR;type=WORK:;;2 Enterprise Avenue;Worktown;NY;01111;USA
item1.X-ABADR:us
item2.ADR;type=HOME;type=pref:;;3 Acacia Avenue;Hoemtown;MA;02222;USA
item2.X-ABADR:us
END:VCARD`);

        expect(sut.addresses.length).toBe(2);
    });

    it('contact with exceptionally empty name shows up as email', () => {
        /* eslint-disable no-trailing-spaces */
        const sut = Contact.fromVcard(null, `BEGIN:VCARD
VERSION:3.0
FN: 
N:;;;;
NICKNAME:
ORG:;
TITLE:
EMAIL;TYPE=home;TYPE=pref:testperson@test.org
NOTE:
PRODID:-//CyrusIMAP.org//Cyrus 3.1.7-238-g170a812-fmstable-20190913v1//EN
END:VCARD`);

        expect(sut.display_name()).toBe('testperson@test.org');
    });

    it('contact with escaped colons does not grow when serialized', () => {
        // needs a double backslash because JS eats one of them itself
        const sut = Contact.fromVcard(null, `BEGIN:VCARD
VERSION:3.0
FN:John Doe
URL;type=pref:http\\://www.example.com/doe
END:VCARD`);

        // same as above: \\ to mean \
        expect(sut.vcard()).toContain('http\\://');
    });

    it('can set a birtday to arbitrary text', () => {
        const sut = new Contact({});
        sut.nickname = 'Birthday Boy';
        sut.birthday = 'yesterday';

        expect(sut.vcard().toLowerCase()).toContain('bday;value=text:yesterday');
    });

    it('can set photo to a data uri', () => {
        let sut = new Contact({});
        sut.nickname = 'Mr Photographed';

        const uri = 'data:image/jpeg;base64,/9j/4AAQ';

        sut.photo = uri;

        sut = Contact.fromVcard(null, sut.vcard());
        expect(sut.photo).toBe(uri);
    });

    it('can create a SETTINGSONLY contact', () => {
        const sut = new Contact({});
        sut.kind = ContactKind.SETTINGSONLY;
        sut.show_external_html = true;
        expect(() => sut.vcard()).not.toThrow();

        expect(sut.vcard()).toContain('X-SHOWEXTERNALHTML:true');
        expect(sut.vcard()).toContain('settingsonly');
    });
});
