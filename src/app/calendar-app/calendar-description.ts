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

const htmlEntities: { [entity: string]: string } = {
    amp: '&',
    apos: '\'',
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
};

const knownHtmlTag =
    '(?:a|article|b|blockquote|body|br|center|code|div|em|font|footer|h[1-6]|head|header|html|i|li|meta|ol|p|pre|section|small|span|strong|style|table|tbody|td|tfoot|th|thead|title|tr|u|ul)';
const knownHtmlTagPattern = new RegExp(`<\\s*/?\\s*${knownHtmlTag}(?:\\s|>|/)`, 'i');
const knownHtmlTagRemovalPattern = new RegExp(`<\\s*/?\\s*${knownHtmlTag}(?:\\s+[^>]*)?\\s*/?>`, 'gi');

export function formatCalendarDescriptionForDisplay(description?: string): string {
    if (!description) {
        return '';
    }

    const decoded = decodeHtmlEntities(description);
    if (!knownHtmlTagPattern.test(decoded)) {
        return decoded;
    }

    return htmlToPlainText(decoded);
}

function htmlToPlainText(value: string): string {
    return decodeHtmlEntities(value)
        .replace(/<\s*(script|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
        .replace(/<\s*br\s*\/?>/gi, '\n')
        .replace(
            /<\s*\/\s*(?:article|blockquote|div|footer|h[1-6]|header|li|p|pre|section|table|tr)\s*>/gi,
            '\n'
        )
        .replace(knownHtmlTagRemovalPattern, '')
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n[ \t]+/g, '\n')
        .replace(/\n{2,}/g, '\n')
        .trim();
}

function decodeHtmlEntities(value: string): string {
    let decoded = value;
    for (let i = 0; i < 3; i++) {
        const next = decoded.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]+);/gi, (_match, entity: string) => {
            return decodeHtmlEntity(entity);
        });
        if (next === decoded) {
            break;
        }
        decoded = next;
    }
    return decoded;
}

function decodeHtmlEntity(entity: string): string {
    const normalized = entity.toLowerCase();
    if (normalized.startsWith('#x')) {
        return decodeNumericEntity(normalized.slice(2), 16, entity);
    }
    if (normalized.startsWith('#')) {
        return decodeNumericEntity(normalized.slice(1), 10, entity);
    }
    return htmlEntities[normalized] || `&${entity};`;
}

function decodeNumericEntity(value: string, radix: number, original: string): string {
    const codePoint = Number.parseInt(value, radix);
    if (Number.isNaN(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
        return `&${original};`;
    }
    return String.fromCodePoint(codePoint);
}
