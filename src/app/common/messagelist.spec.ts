// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2022 Runbox Solutions AS (runbox.com).
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

import { MessageInfo } from './messageinfo';
import { MessageList } from './messagelist';
import { MailAddressInfo } from './mailaddressinfo';

describe('MessageList', () => {
    const getMessageList = (fromAddress: string, toAddress: string) => new MessageList([
        new MessageInfo(
            1,
            new Date(),
            new Date(),
            'Inbox',
            false,
            false,
            false,
            MailAddressInfo.parse(fromAddress),
            MailAddressInfo.parse(toAddress),
            [],
            [],
            'Test subject',
            'Test message',
            42,
            false
        )
    ]);

    it('shows the sender email address in the From column tooltip', () => {
        const messageList = getMessageList(
            '"Runbox Support" <support@example.com>',
            '"Customer" <customer@example.com>'
        );
        const columns = messageList.getCanvasTableColumns({ selectedFolder: 'Inbox' });
        const fromColumn = columns.find((column) => column.name === 'From');

        expect(fromColumn.getValue(0)).toBe('Runbox Support');
        expect((fromColumn.tooltipText as (rowIndex: number) => string)(0)).toBe('support@example.com');
    });

    it('shows the recipient email address in the Sent folder To column tooltip', () => {
        const messageList = getMessageList(
            '"Runbox User" <user@example.com>',
            '"Customer" <customer@example.com>'
        );
        const columns = messageList.getCanvasTableColumns({ selectedFolder: 'Sent' });
        const toColumn = columns.find((column) => column.name === 'To');

        expect(toColumn.getValue(0)).toBe('Customer');
        expect((toColumn.tooltipText as (rowIndex: number) => string)(0)).toBe('customer@example.com');
    });

    it('does not add a duplicate tooltip when the email address is already visible', () => {
        const messageList = getMessageList(
            'support@example.com',
            'customer@example.com'
        );
        const columns = messageList.getCanvasTableColumns({ selectedFolder: 'Inbox' });
        const fromColumn = columns.find((column) => column.name === 'From');

        expect(fromColumn.getValue(0)).toBe('support@example.com');
        expect((fromColumn.tooltipText as (rowIndex: number) => string)(0)).toBeNull();
    });
});
