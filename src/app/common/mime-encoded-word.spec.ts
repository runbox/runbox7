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

import { decodeMimeEncodedWords } from './mime-encoded-word';

describe('decodeMimeEncodedWords', () => {
    it('leaves plain text unchanged', () => {
        expect(decodeMimeEncodedWords('Regular subject')).toBe('Regular subject');
    });

    it('decodes UTF-8 Q encoded words', () => {
        expect(decodeMimeEncodedWords('=?UTF-8?Q?Koteck=C3=BD?=')).toBe('Koteck\u00fd');
    });

    it('decodes UTF-8 base64 encoded words', () => {
        expect(decodeMimeEncodedWords('=?UTF-8?B?S290ZWNrw70=?=')).toBe('Koteck\u00fd');
    });

    it('joins adjacent encoded words without their transport whitespace', () => {
        expect(decodeMimeEncodedWords('=?UTF-8?Q?Koteck?= =?UTF-8?Q?=C3=BD?=')).toBe('Koteck\u00fd');
    });

    it('decodes encoded words embedded in normal header text', () => {
        expect(decodeMimeEncodedWords('[=?UTF-8?Q?Par_S=C3=A9rie?=] renewal')).toBe('[Par S\u00e9rie] renewal');
    });

    it('leaves unsupported encoded words unchanged', () => {
        expect(decodeMimeEncodedWords('=?X-UNKNOWN?Q?Koteck=C3=BD?=')).toBe('=?X-UNKNOWN?Q?Koteck=C3=BD?=');
    });
});
