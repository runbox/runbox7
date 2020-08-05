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

export class MailAddressInfo {
    nameAndAddress: string;

    constructor(public name: string, public address: string) {
        this.nameAndAddress = name ? `"${name}" <${address}>` : address;
    }

    public static parse(mailaddr: string): MailAddressInfo[] {
        const ret: MailAddressInfo[] = [];
        let namePart = false;
        let addrPart = false;
        let lastStart = 0;
        let name: string = null;
        let addr: string = null;
        for (let n = 0; n < mailaddr.length; n++) {
            const ch = mailaddr.charAt(n);

            switch (ch) {
                case '"':
                    namePart = !namePart;

                    if (namePart) {
                        lastStart = n + 1;
                    } else {
                        name = mailaddr.substring(lastStart, n).trim();
                    }
                    break;
                case ',':
                    if (!namePart) {
                        if (!addr) {
                            addr = mailaddr.substring(lastStart, n).trim();
                        }
                        ret.push(new MailAddressInfo(name, addr));
                        addr = null;
                        name = null;
                        lastStart = n + 1;
                    }
                    break;
                case '<':
                    if (!namePart) {
                        addrPart = true;
                        if (name == null) {
                            name = mailaddr.substring(lastStart, n).trim();
                        }
                        lastStart = n + 1;
                    }
                    break;
                case '>':
                    if (!namePart) {
                        addrPart = false;
                        addr = mailaddr.substring(lastStart, n).trim();
                    }
                    break;
            }
        }
        if (!addr) {
            addr = mailaddr.substring(lastStart, mailaddr.length).trim();
        }
        ret.push(new MailAddressInfo(name, addr));
        return ret;
    }
}
