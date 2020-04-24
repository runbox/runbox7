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

import * as ICAL from 'ical.js';
import { v4 as uuidv4 } from 'uuid';

// same should be done for bday, documented and PR'd to https://github.com/mozilla-comm/ical.js
ICAL.design.vcard3.property.tel.defaultType = 'text';

export class StringValueWithTypes {
    types: string[];
    value: string;
}

export class AddressDetails {
    constructor(public values: string[]) { }

    get street():    string { return this.values[2]; }
    get city():      string { return this.values[3]; }
    get region():    string { return this.values[4]; }
    get post_code(): string { return this.values[5]; }
    get country():   string { return this.values[6]; }

}

export class Address {
    constructor(
        public types: string[],
        public value: AddressDetails,
    ) { }

    toDict() {
        return {
            types:     this.types,
            value: {
                street:    this.value.street,
                city:      this.value.city,
                region:    this.value.region,
                post_code: this.value.post_code,
                country:   this.value.country,
            }
        };
    }
}

export class Contact {
    component: ICAL.Component;
    url:       string;
    rmm_backed = false;

    static fromVcard(url: string, vcard: string): Contact {
        const contact = new Contact({});
        contact.component = ICAL.Component.fromString(vcard);
        contact.url = url;
        return contact;
    }

    private getIndexedValue(name: string, index: number): string {
        const value = this.component.getFirstPropertyValue(name);
        if (value) {
            return value[index];
        } else {
            return null;
        }
    }

    private setIndexedValue(name: string, index: number, value: string) {
        let prop = this.component.getFirstProperty(name);
        let values: string[];
        if (prop) {
            // We need this weird dance since getValues() returns
            // an array of values wrapped in an array anyway.
            const propValue = prop.getValues();
            if (!propValue) {
                values = [];
            } else {
                values = propValue[0];
            }
        } else {
            prop = new ICAL.Property(name, this.component);
            this.component.addProperty(prop);
            values = [];
        }
        values[index] = value;
        // need to fix up the empty spots,
        // otherwise ICAL.js will crap itself
        for (let i = 0; i < index; i++) {
            if (values[i] === undefined) {
                values[i] = '';
            }
        }
        prop.setValue(values);
    }

    private getMultiValProp(name: string): string[] {
        const prop = this.component.getFirstProperty(name);
        return prop ? prop.getValues() : [];
    }

    private setMultiValProp(name: string, values: string[]) {
        if (this.component.hasProperty(name)) {
            this.component.removeAllProperties(name);
        }
        if (values.length > 0) {
            const prop = new ICAL.Property(name, this.component);
            prop.setValue(values);
            this.component.addProperty(prop);
        }
    }

    private setMultiValPropWithTypes(name: string, values: StringValueWithTypes[]) {
        if (this.component.hasProperty(name)) {
            this.component.removeAllProperties(name);
        }
        for (const e of values) {
            const prop = this.component.addPropertyWithValue(name, e.value);
            if (e.types.length > 0) {
                prop.setParameter('type', e.types);
            }
        }
    }

    private getPropertyTypes(p: ICAL.Property): string[] {
        let types = p.getParameter('type');
        if (types === undefined) {
            types = [];
        } else if (typeof types === 'string') {
            types = [types];
        }
        return types;
    }

    private normalizeStringProperty(p: ICAL.Property): StringValueWithTypes {
        return {
            types: this.getPropertyTypes(p),
            value: p.getFirstValue(),
        };
    }

    private multiplePropertiesNormalized(name: string): StringValueWithTypes[] {
        const props = this.component.getAllProperties(name);
        if (props) {
            return props.map((e: ICAL.Property) => this.normalizeStringProperty(e));
        } else {
            return [];
        }
    }

    private setPropertyValue(name: string, value: string) {
        const prop = this.component.getFirstProperty(name);
        if (prop) {
            prop.setValue(value);
        } else {
            this.component.addPropertyWithValue(name, value);
        }
    }

    get id(): string {
        return this.component.getFirstPropertyValue('uid');
    }

    set id(value: string) {
        this.setPropertyValue('uid', value);
    }

    get nickname(): string {
        return this.component.getFirstPropertyValue('nickname');
    }

    set nickname(value: string) {
        this.setPropertyValue('nickname', value);
    }

    get first_name(): string {
        return this.getIndexedValue('n', 1);
    }

    set first_name(value: string) {
        this.setIndexedValue('n', 1, value);
    }

    get last_name(): string {
        return this.getIndexedValue('n', 0);
    }

    set last_name(value: string) {
        this.setIndexedValue('n', 0, value);
    }

    get categories(): string[] {
        return this.getMultiValProp('categories');
    }

    set categories(value: string[]) {
        this.setMultiValProp('categories', value);
    }

    get company(): string {
        const org = this.component.getFirstPropertyValue('org');
        // Some vCard emiters (like Nextcloud) will store this as a string
        // rather than an array that it should be.
        if (Array.isArray(org)) {
            return org[0];
        } else {
            return org;
        }
    }

    set company(value: string) {
        this.setIndexedValue('org', 0, value);
    }

    get department(): string {
        return this.getIndexedValue('org', 1);
    }

    set department(value: string) {
        this.setIndexedValue('org', 1, value);
    }

    get birthday(): string {
        // ICAL.js is bad at parsing this,
        // ignores VALUE=text and assumes it's a date
        const prop = this.component.getFirstProperty('bday');
        if (prop) {
            return prop.toJSON()[3];
        }
    }

    set birthday(value: string) {
        this.setPropertyValue('bday', value);
    }

    get note(): string {
        return this.component.getFirstPropertyValue('note');
    }

    set note(value: string) {
        this.setPropertyValue('note', value);
    }

    get emails(): StringValueWithTypes[] {
        return this.multiplePropertiesNormalized('email');
    }

    set emails(emails: StringValueWithTypes[]) {
        this.setMultiValPropWithTypes('email', emails);
    }

    get phones(): StringValueWithTypes[] {
        return this.multiplePropertiesNormalized('tel');
    }

    set phones(phones: StringValueWithTypes[]) {
        this.setMultiValPropWithTypes('tel', phones);
    }

    get urls(): StringValueWithTypes[] {
        return this.multiplePropertiesNormalized('url');
    }

    set urls(urls: StringValueWithTypes[]) {
        this.setMultiValPropWithTypes('url', urls);
    }

    get addresses(): Address[] {
        const props = this.component.getAllProperties('adr');
        if (props) {
            return props.map((p: ICAL.Property) => {
                return new Address(
                    this.getPropertyTypes(p),
                    new AddressDetails(p.getFirstValue()),
                );
            });
        } else {
            return [];
        }
    }

    get related(): StringValueWithTypes[] {
        return this.multiplePropertiesNormalized('related');
    }

    set related(related: StringValueWithTypes[]) {
        this.setMultiValPropWithTypes('related', related);
    }

    toDict(): any {
        return {
            nickname:   this.nickname,
            first_name: this.first_name,
            last_name:  this.last_name,
            categories: this.categories,
            company:    this.company,
            department: this.department,
            birthday:   this.birthday,
            note:       this.note,
            emails:     this.emails,
            phones:     this.phones,
            urls:       this.urls,
            addresses:  this.addresses.map(a => a.toDict()),
            related:    this.related,
        };
    }

    vcard(): string {
        if (!this.component.getFirstPropertyValue('fn')) {
            let fn: string;
            if (this.nickname) {
                fn = this.nickname;
            } else if (this.first_name || this.last_name) {
                fn = [this.first_name, this.last_name].join(' ');
            } else if (this.company) {
                fn = this.company;
                this.component.setPropertyValue('X-ABSHOWAS', 'COMPANY');
            } else if (this.primary_email()) {
                fn = this.primary_email();
            } else {
                throw new Error("Can't deduce a fullname for contact");
            }
            this.setPropertyValue('fn', fn);
        }

        // if (!this.id) {
        //     this.id = uuidv4().toUpperCase();
        // }

        return this.component.toString();
    }

    constructor(properties: any) {
        this.component = new ICAL.Component('vcard');

        // backcompat with old RMM contacts API
        if (typeof properties['id'] === 'number') {
            properties['id'] = 'RMM-' + properties['id'];
        }
        if (properties['email']) {
            properties['emails'] = [
                { 'types': ['home'], 'value': properties['email'] }
            ];
            delete properties['email'];
        }

        // tslint:disable-next-line:forin
        for (const key in properties) {
            if (properties[key] !== null && properties[key] !== '') {
                this[key] = properties[key];
            }
        }

        if (this.id && this.id.substr(0, 4) === 'RMM-') {
            this.rmm_backed = true;
        }

        // if the contact contains fullname (FN) but not any other names,
        // rewrite the FN into the nickname
        if (!this.nickname && !this.first_name && !this.last_name && properties['fullname']) {
            this.nickname = properties['fullname'];
        }
    }

    get_rmm_id(): number {
        return Number(this.id.substr(4));
    }

    display_name(): string|null {
        if (this.show_as_company()) {
            return this.company;
        }

        if (this.nickname) {
            const fn = this.full_name();
            const postfix = fn ?  (' (' + fn + ')') : '';
            return this.nickname + postfix;
        }

        return this.full_name();
    }

    full_name(): string {
        if (this.first_name && this.last_name) {
            return this.first_name + ' ' + this.last_name;
        } else if (this.first_name) {
            return this.first_name;
        } else {
            return this.last_name;
        }
    }

    primary_email(): string {
        if (this.emails.length > 0) {
            return this.emails[0].value;
        }
        return null;
    }

    show_as_company(): boolean {
        return this['show_as'] === 'COMPANY';
    }
}
