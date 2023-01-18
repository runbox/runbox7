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

import { MailAddressInfo } from '../common/mailaddressinfo';

const EMAIL_REGEXP =
    // eslint-disable-next-line max-len
    /^(?=.{1,254}$)(?=.{1,64}@)[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+(\.[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+)*@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;

/**
 * Extract the email part of the input string (either plain email address or inside <>), and test it against the regexp.
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

/**
 * Validate each email in the list, return true if all are valid
 * @param emailList
 */
export function isValidEmailList(emailList: string) {
    if (!emailList) {
        return false;
    }
    return emailList.split(',').every((recipient => isValidEmail(recipient)));
}

/**
 * Validate each email in the array, return true if all are valid
 * @param emailList
 */
export function isValidEmailArray(emailList: MailAddressInfo[]) {
    if (!emailList) {
        return false;
    }
    return emailList.every((recipient => isValidEmail(recipient.address)));
}
