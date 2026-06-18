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

import { ChangeDetectorRef } from '@angular/core';
import { AsyncSubject, of, Subject } from 'rxjs';

import { UsageReportsService } from '../common/usage-reports.service';
import { ProfileService } from '../profiles/profile.service';
import { SearchIndexDocumentData, SearchService } from '../xapian/searchservice';
import { ContactHilights, StartDeskComponent } from './startdesk.component';

describe('StartDeskComponent', () => {
    let component: StartDeskComponent;
    let messages: Map<number, SearchIndexDocumentData>;

    beforeEach(() => {
        messages = new Map<number, SearchIndexDocumentData>();
        const searchService = {
            initSubject: new AsyncSubject<boolean>(),
            indexReloadedSubject: new Subject<void>(),
            getMessagesInTimeRange: jasmine.createSpy('getMessagesInTimeRange').and.callFake(() => Array.from(messages.keys())),
            getDocData: jasmine.createSpy('getDocData').and.callFake((id: number) => messages.get(id)),
        } as unknown as SearchService;

        component = new StartDeskComponent(
            { detectChanges: jasmine.createSpy('detectChanges') } as unknown as ChangeDetectorRef,
            searchService,
            { validProfiles: of([{ email: 'me@example.com' }]) } as unknown as ProfileService,
            { report: jasmine.createSpy('report') } as unknown as UsageReportsService,
        );
        component.ownAddresses.next(new Set(['me@example.com']));
    });

    it('sorts mailing-list and combined overview rows by count', async () => {
        messages.set(1, message(1, 'Alice <alice@example.com>', 'Direct message', ['me@example.com']));
        messages.set(2, message(2, 'One <one@example.com>', 'First smaller list message', ['small-list@example.com']));
        messages.set(3, message(3, 'Two <two@example.com>', 'Second smaller list message', ['small-list@example.com']));
        messages.set(4, message(4, 'Three <three@example.com>', 'First larger list message', ['large-list@example.com']));
        messages.set(5, message(5, 'Four <four@example.com>', 'Second larger list message', ['large-list@example.com']));
        messages.set(6, message(6, 'Five <five@example.com>', 'Third larger list message', ['large-list@example.com']));

        await component.updateCommsOverview();

        expect(component.regularOverview.map(senderCount)).toEqual(['Alice:1']);
        expect(component.mailingListOverview.map(senderCount)).toEqual(['large-list@example.com:3', 'small-list@example.com:2']);
        expect(component.allOverview.map(senderCount)).toEqual([
            'large-list@example.com:3',
            'small-list@example.com:2',
            'Alice:1',
        ]);
    });

    function message(id: number, from: string, subject: string, recipients: string[]): SearchIndexDocumentData {
        return {
            id: `Q${id}`,
            from,
            subject,
            recipients,
            textcontent: '',
            folder: 'Inbox',
            seen: false,
        } as SearchIndexDocumentData;
    }

    function senderCount(sender: ContactHilights): string {
        return `${sender.name}:${sender.emails.length}`;
    }
});
