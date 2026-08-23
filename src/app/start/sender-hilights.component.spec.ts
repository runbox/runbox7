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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatIconModule } from '@angular/material/icon';
import { RouterTestingModule } from '@angular/router/testing';

import { SearchIndexDocumentData } from '../xapian/searchservice';
import { SenderHilightsComponent } from './sender-hilights.component';

describe('SenderHilightsComponent', () => {
    let component: SenderHilightsComponent;
    let fixture: ComponentFixture<SenderHilightsComponent>;

    const message = (date?: string): SearchIndexDocumentData => ({
        id: 'M123',
        date,
        folder: 'Inbox',
        from: 'sender@example.com',
        subject: 'Quarterly report',
        recipients: ['me@example.com'],
        textcontent: '',
    });

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [SenderHilightsComponent],
            imports: [
                MatButtonModule,
                MatCardModule,
                MatIconModule,
                RouterTestingModule,
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(SenderHilightsComponent);
        component = fixture.componentInstance;
    });

    it('shows message dates before subjects when overview messages have indexed dates', () => {
        component.sender = {
            icon: 'person',
            name: 'Sender',
            emails: [message('202001020304')],
        };
        component.ngOnChanges();

        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('.emailDate').textContent.trim()).toBe('2020-01-02');
        expect(compiled.textContent).toContain('Quarterly report');
    });

    it('omits the message date when the overview message has no indexed date', () => {
        component.sender = {
            icon: 'person',
            name: 'Sender',
            emails: [message()],
        };
        component.ngOnChanges();

        fixture.detectChanges();

        expect((fixture.nativeElement as HTMLElement).querySelector('.emailDate')).toBeNull();
    });
});
