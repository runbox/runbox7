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

export class Email {
    types: string[];
    value: string;
}

export class Contact {
    id: string;
    nickname: string;
    first_name: string;
    last_name: string;
    emails: Email[] = [];

    rmm_backed = false;

    constructor(properties: any) {
        // tslint:disable-next-line:forin
        for (const key in properties) {
            this[key] = properties[key];
        }

        if (this.id.substr(0, 4) === "RMM-") {
            this.rmm_backed = true;
        }
    }

    display_name(): string {
        if (this.nickname) {
            return this.nickname;
        } else if (this.full_name()) {
            return this.full_name();
        }
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
}
