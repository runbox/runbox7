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

import { getDraftHtmlBody } from './compose.component';

describe('getDraftHtmlBody', () => {
    it('uses the explicit parsed HTML body when available', () => {
        expect(getDraftHtmlBody({
            text: {
                html: '<p>Rich draft</p>',
                text: 'Rich draft',
            }
        })).toBe('<p>Rich draft</p>');
    });

    it('uses the text body for legacy HTML drafts with a content-type header', () => {
        expect(getDraftHtmlBody({
            headers: {
                'content-type': {
                    value: 'text/html',
                    params: {
                        charset: 'utf-8',
                    },
                },
            },
            text: {
                text: '<p>Legacy rich draft</p>',
            },
        })).toBe('<p>Legacy rich draft</p>');
    });

    it('uses the text body when the text part reports an HTML type', () => {
        expect(getDraftHtmlBody({
            text: {
                type: 'html',
                text: '<div>Legacy rich draft</div>',
            },
        })).toBe('<div>Legacy rich draft</div>');
    });

    it('does not infer HTML mode for ordinary plaintext without metadata', () => {
        expect(getDraftHtmlBody({
            headers: {},
            text: {
                text: 'Use <b> tags literally in this draft.',
            },
        })).toBeNull();
    });
});
