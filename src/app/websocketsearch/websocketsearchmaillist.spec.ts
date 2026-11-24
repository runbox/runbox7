// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2020 Runbox Solutions AS (runbox.com).
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

import { WebSocketSearchMailList } from './websocketsearchmaillist';

describe('WebSocketSearchMailList', () => {
    it('shows the sender email address in the From column tooltip', () => {
        const messageList = new WebSocketSearchMailList([
            {
                id: 1,
                dateTime: '20260609',
                subject: 'Test subject',
                fromName: 'Runbox Support',
                fromAddr: 'support@example.com',
                seen: false,
                size: 42
            }
        ]);
        const columns = messageList.getCanvasTableColumns({});
        const fromColumn = columns.find((column) => column.name === 'From');

        expect(fromColumn.getValue(0)).toBe('Runbox Support');
        expect((fromColumn.tooltipText as (rowIndex: number) => string)(0)).toBe('support@example.com');
    });

    it('does not add a duplicate tooltip when the email address is already visible', () => {
        const messageList = new WebSocketSearchMailList([
            {
                id: 1,
                dateTime: '20260609',
                subject: 'Test subject',
                fromName: 'support@example.com',
                fromAddr: 'support@example.com',
                seen: false,
                size: 42
            }
        ]);
        const columns = messageList.getCanvasTableColumns({});
        const fromColumn = columns.find((column) => column.name === 'From');

        expect(fromColumn.getValue(0)).toBe('support@example.com');
        expect((fromColumn.tooltipText as (rowIndex: number) => string)(0)).toBeNull();
    });
});
