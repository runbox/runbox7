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
// Runbox 7 is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
// General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Runbox 7. If not, see <https://www.gnu.org/licenses/>.
// ---------- END RUNBOX LICENSE ----------

import { fakeAsync, tick } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { MailRecipientInputComponent } from './mailrecipientinput.component';
import { Recipient } from './recipient';
import { RecipientsService } from './recipients.service';

function recipient(name: string, email: string): Recipient {
    return new Recipient([`"${name}" <${email}>`], `"${name}" <${email}>`);
}

describe('MailRecipientInputComponent', () => {
    it('filters autocomplete options from the latest recipient list only', fakeAsync(() => {
        const initialRecipients = [
            recipient('Alex Example', 'alex@example.com'),
            recipient('Bailey Example', 'bailey@example.com'),
        ];
        const currentRecipients = [
            recipient('Alex Example', 'alex@example.com'),
            recipient('Alex Home', 'alex.home@example.com'),
            recipient('Alex Work', 'alex.work@example.com'),
            recipient('Bailey Example', 'bailey@example.com'),
        ];
        const recipients = new BehaviorSubject<Recipient[]>(initialRecipients);
        const recipientsService = { recipients } as unknown as RecipientsService;
        const component = new MailRecipientInputComponent(
            null,
            recipientsService,
        );
        const matchingEmissions: string[][] = [];

        component.filteredRecipients.subscribe(filtered => {
            if (filtered.length > 0) {
                matchingEmissions.push(filtered.map(match => match.name));
            }
        });

        recipients.next(currentRecipients);
        component.searchTextFormControl.setValue('alex');
        tick(51);

        expect(matchingEmissions).toEqual([[
            '"Alex Example" <alex@example.com>',
            '"Alex Home" <alex.home@example.com>',
            '"Alex Work" <alex.work@example.com>',
        ]]);
    }));
});
