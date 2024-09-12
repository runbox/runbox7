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

import { MailAddressInfo } from '../common/mailaddressinfo';

describe('MailAddressInfo', () => {
    it('Construct with name and email', () => {
        const ma = new MailAddressInfo('Test', 'test1@runbox.com');
        expect(ma.name).toBe('Test');
        expect(ma.address).toBe('test1@runbox.com');
        expect(ma.nameAndAddress).toBe('"Test" <test1@runbox.com>');
        expect(ma.domain).toBe('runbox.com');
    });
    it('Parse single email address', () => {
        const ma = MailAddressInfo.parse('test1@runbox.com');
        expect(ma[0].name).toBe(null);
        expect(ma[0].address).toBe('test1@runbox.com');
        expect(ma[0].nameAndAddress).toBe('test1@runbox.com');
        expect(ma[0].domain).toBe('runbox.com');
    });
    it('Parse full single address', () => {
        const ma = MailAddressInfo.parse('"Test" <test1@runbox.com>');
        expect(ma[0].name).toBe('Test');
        expect(ma[0].address).toBe('test1@runbox.com');
        expect(ma[0].nameAndAddress).toBe('"Test" <test1@runbox.com>');
    });
    it('Parse full single address, no quotes', () => {
        const ma = MailAddressInfo.parse('Test <test1@runbox.com>');
        expect(ma[0].name).toBe('Test');
        expect(ma[0].address).toBe('test1@runbox.com');
        expect(ma[0].nameAndAddress).toBe('"Test" <test1@runbox.com>');
    });
    it('Parse address list', () => {
        const ma_list = MailAddressInfo.parse('test1@runbox.com,test2@runbox.com');
        expect(ma_list[0].name).toBe(null);
        expect(ma_list[0].address).toBe('test1@runbox.com');
        expect(ma_list[0].nameAndAddress).toBe('test1@runbox.com');
        expect(ma_list[1].name).toBe(null);
        expect(ma_list[1].address).toBe('test2@runbox.com');
        expect(ma_list[1].nameAndAddress).toBe('test2@runbox.com');
    });
    it('Parse empty names address', () => {
        const ma_list = MailAddressInfo.parse('"" <test1@runbox.com>');
        expect(ma_list[0].name).toBe('');
        expect(ma_list[0].address).toBe('test1@runbox.com');
        expect(ma_list[0].nameAndAddress).toBe('test1@runbox.com');
    });
    it('Parse full address list', () => {
        const ma_list = MailAddressInfo.parse('"Test1" <test1@runbox.com>, "Test2" <test2@runbox.com>');
        expect(ma_list[0].name).toBe('Test1');
        expect(ma_list[0].address).toBe('test1@runbox.com');
        expect(ma_list[0].nameAndAddress).toBe('"Test1" <test1@runbox.com>');
        expect(ma_list[1].name).toBe('Test2');
        expect(ma_list[1].address).toBe('test2@runbox.com');
        expect(ma_list[1].nameAndAddress).toBe('"Test2" <test2@runbox.com>');
    });
    it('Parse multi-level domain', () => {
        const ma_list = MailAddressInfo.parse('"Fred B" <fred@foo.bar.baz.tld>');
        expect(ma_list[0].name).toBe('Fred B');
        expect(ma_list[0].address).toBe('fred@foo.bar.baz.tld');
        expect(ma_list[0].nameAndAddress).toBe('"Fred B" <fred@foo.bar.baz.tld>');
        expect(ma_list[0].domain).toBe('foo.bar.baz.tld');
    });
});
