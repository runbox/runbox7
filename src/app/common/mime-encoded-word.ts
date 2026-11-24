// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2026 Runbox Solutions AS (runbox.com).
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

const ENCODED_WORD_REGEXP = /=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g;

export function decodeMimeEncodedWords(value: string): string {
    if (!value || value.indexOf('=?') === -1) {
        return value;
    }

    return value
        .replace(/\?=[ \t\r\n]+=\?/g, '?==?')
        .replace(ENCODED_WORD_REGEXP, (encodedWord, charset, encoding, encodedText) => {
            const bytes = encoding.toUpperCase() === 'B'
                ? decodeBase64Bytes(encodedText)
                : decodeQBytes(encodedText);

            if (!bytes) {
                return encodedWord;
            }

            return decodeBytes(bytes, charset) ?? encodedWord;
        });
}

function decodeBase64Bytes(value: string): Uint8Array {
    if (typeof atob !== 'function') {
        return null;
    }

    try {
        const binary = atob(value.replace(/\s/g, ''));
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index++) {
            bytes[index] = binary.charCodeAt(index);
        }
        return bytes;
    } catch (e) {
        return null;
    }
}

function decodeQBytes(value: string): Uint8Array {
    const bytes: number[] = [];

    for (let index = 0; index < value.length; index++) {
        const char = value.charAt(index);
        if (char === '_') {
            bytes.push(0x20);
        } else if (
            char === '='
            && index + 2 < value.length
            && /^[0-9A-Fa-f]{2}$/.test(value.substr(index + 1, 2))
        ) {
            bytes.push(parseInt(value.substr(index + 1, 2), 16));
            index += 2;
        } else {
            bytes.push(char.charCodeAt(0));
        }
    }

    return new Uint8Array(bytes);
}

function decodeBytes(bytes: Uint8Array, charset: string): string {
    const normalizedCharset = normalizeCharset(charset);

    if (typeof TextDecoder !== 'undefined') {
        try {
            return new TextDecoder(normalizedCharset).decode(bytes);
        } catch (e) {
            // Fall through to the UTF-8 fallback below.
        }
    }

    if (normalizedCharset === 'utf-8' || normalizedCharset === 'us-ascii') {
        try {
            return decodeURIComponent(Array.from(bytes)
                .map((byte) => '%' + byte.toString(16).padStart(2, '0'))
                .join(''));
        } catch (e) {
            return null;
        }
    }

    return null;
}

function normalizeCharset(charset: string): string {
    const normalized = charset.trim().toLowerCase();

    switch (normalized) {
        case 'utf8':
            return 'utf-8';
        case 'latin1':
        case 'latin-1':
            return 'iso-8859-1';
        default:
            return normalized;
    }
}
