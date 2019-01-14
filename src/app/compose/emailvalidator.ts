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

const EMAIL_REGEXP =
    // tslint:disable-next-line:max-line-length
    /^(?=.{1,254}$)(?=.{1,64}@)[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+(\.[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+)*@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;

/**
 * Extract the email part of the input string (either plain email address or inside <>)
 * @param email 
 */
export function isValidEmail(email: string) {
    email = email.trim();
    const emailpartindex = email.indexOf('<');
    if (emailpartindex >= 0 && email.indexOf('>') === email.length - 1 && email.indexOf(',') === -1) {
        const emailpart = email.substr(emailpartindex + 1, email.length - emailpartindex - 2);
        return EMAIL_REGEXP.test(emailpart) ? emailpart : false;
    } else {
        return EMAIL_REGEXP.test(email);
    }
}
