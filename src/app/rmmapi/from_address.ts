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

export class FromAddress {
    public email: string;
    public reply_to: string;
    public id: number;
    public folder: string;
    public name: string;
    public signature: string;
    public is_signature_html: boolean;
    public type: string;
    public priority: number;

    public nameAndAddress: string;

    public static fromNameAndAddress(name: string, address: string): FromAddress {
        const ret = new FromAddress();
        ret.name = name;
        ret.email = address;
        ret.resolveNameAndAddress();
        return ret;
    }

    public static fromObject(obj: any): FromAddress {
        const ret = Object.assign(new FromAddress(), obj);
        ret.resolveNameAndAddress();
        return ret;
    }

    public static fromEmailAddress(email): FromAddress {
        const ret = new FromAddress();
        ret.email = email;
        ret.reply_to = email;
        return ret;
    }

    private resolveNameAndAddress() {
        this.nameAndAddress = this.name ? `${this.name} <${this.email}>` : this.email;
    }

}
