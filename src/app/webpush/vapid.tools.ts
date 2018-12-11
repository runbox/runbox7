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

import { toByteArray, fromByteArray } from 'base64-js';

export function urlbase64decode(base64) {
    // Add removed at end '='
    base64 += Array(5 - base64.length % 4).join('=');

    base64 = base64
        .replace(/\-/g, '+') // Convert '-' to '+'
        .replace(/\_/g, '/'); // Convert '_' to '/'

    return toByteArray(base64);
}

export function urlbase64encode(buffer) {
    return fromByteArray(buffer)
        .replace(/\+/g, '-') // Convert '+' to '-'
        .replace(/\//g, '_') // Convert '/' to '_'
        .replace(/=+$/, ''); // Remove ending '='

}

export function exportKeysFromJWK(jwk) {
    const x = urlbase64decode(jwk.x);
    const y = urlbase64decode(jwk.y);

    const publicKey = new Uint8Array(65);
    publicKey.set([0x04], 0);
    publicKey.set(x, 1);
    publicKey.set(y, 33);

    return {
        public: urlbase64encode(publicKey),
        private: jwk.d
    };
}
