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

import { ComposeComponent } from './compose.component';
import { MailAddressInfo } from '../common/mailaddressinfo';

class TestDataTransfer {
    private values: { [key: string]: string } = {};

    setData(type: string, value: string) {
        this.values[type] = value;
    }

    getData(type: string): string {
        return this.values[type] || '';
    }
}

describe('Compose recipient drag and drop', () => {
    const alice = MailAddressInfo.parse('Alice <alice@example.com>')[0];

    function fakeCompose() {
        const component = {
            model: { to: [alice], cc: [], bcc: [] },
            onUpdateRecipient(field: string, recipients: MailAddressInfo[]) {
                this.model[field] = recipients;
            }
        };
        return component;
    }

    it('moves an existing recipient from To to CC', () => {
        const component = fakeCompose();
        const dataTransfer = new TestDataTransfer();
        dataTransfer.setData('recipient', alice.nameAndAddress);
        dataTransfer.setData('recipientSource', 'to');

        ComposeComponent.prototype.recipientDropped.call(
            component,
            { dataTransfer } as unknown as DragEvent,
            'cc'
        );

        expect(component.model.to).toEqual([]);
        expect(component.model.cc).toEqual([alice]);
    });

    it('does not duplicate a recipient dropped back onto the same field', () => {
        const component = fakeCompose();
        const dataTransfer = new TestDataTransfer();
        dataTransfer.setData('recipient', alice.nameAndAddress);
        dataTransfer.setData('recipientSource', 'to');

        ComposeComponent.prototype.recipientDropped.call(
            component,
            { dataTransfer } as unknown as DragEvent,
            'to'
        );

        expect(component.model.to).toEqual([alice]);
    });
});
