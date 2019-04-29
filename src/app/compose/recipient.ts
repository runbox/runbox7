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

import { Contact } from '../contacts-app/contact';

export class Recipient {
    name: string;
    members: string[];

    static fromSearchIndex(addressLine: string) {
        return new this([addressLine]);
    }

    static fromContact(contact: Contact, email: string) {
        return new this([`"${contact.display_name()}" <${email}>`]);
    }

    static fromGroup(groupName: string, contacts: any[]) {
        const members = [];
        for (const c of contacts) {
            for (const e of c.emails) {
                let emailDesc = '';
                if (c.emails.length > 1) {
                    emailDesc = ' (' + e.types.join(', ') + ')';
                }
                members.push(`"${c.full_name()}${emailDesc}" <${e.value}>`);
            }
        }
        const name = `"${groupName}" group (${members.length} members)`;
        return new this(members, name);
    }

    constructor(members: string[], name?: string) {
        this.members = members;
        this.name = name ? name : members.join(' ');
    }

    toStringList(): string[] {
        return this.members;
    }

    toString(): string {
        return this.members.join(' ');
    }
}
