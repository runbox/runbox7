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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ReplaySubject } from 'rxjs';

import { SavedSearchesComponent } from './saved-searches.component';
import { SavedSearch, SavedSearchesService } from './saved-searches.service';

class MockSavedSearchesService {
    searches = new ReplaySubject<SavedSearch[]>(1);
    remove = jasmine.createSpy('remove');
}

describe('SavedSearchesComponent', () => {
    let component: SavedSearchesComponent;
    let fixture: ComponentFixture<SavedSearchesComponent>;
    let service: MockSavedSearchesService;

    const searches: SavedSearch[] = [
        { name: 'Invoices', query: 'from:billing@example.com' },
        { name: 'Travel', query: 'subject:itinerary' },
    ];

    beforeEach(() => {
        service = new MockSavedSearchesService();
        TestBed.configureTestingModule({
            declarations: [ SavedSearchesComponent, MatIcon ],
            imports: [
                MatButtonModule,
                MatExpansionModule,
                MatIconModule,
                MatIconTestingModule,
                MatListModule,
                NoopAnimationsModule,
            ],
            providers: [
                { provide: SavedSearchesService, useValue: service },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(SavedSearchesComponent);
        component = fixture.componentInstance;
        component.expanded = true;
        service.searches.next(searches);
        fixture.detectChanges();
    });

    it('should emit the clicked saved search', () => {
        let emitted: SavedSearch;
        component.searchClicked.subscribe((search: SavedSearch) => emitted = search);

        const rows = fixture.nativeElement.querySelectorAll('button[mat-list-item]');
        rows[1].click();

        expect(emitted).toEqual(searches[1]);
    });

    it('should highlight the selected saved search', () => {
        component.selectedSearch = searches[1];
        fixture.detectChanges();

        const rows = fixture.nativeElement.querySelectorAll('button[mat-list-item]');

        expect(rows[0].classList).not.toContain('selectedFolder');
        expect(rows[1].classList).toContain('selectedFolder');
        expect(rows[1].getAttribute('aria-current')).toBe('page');
    });

    it('should not run a saved search when deleting it', () => {
        let emitted: SavedSearch;
        component.searchClicked.subscribe((search: SavedSearch) => emitted = search);

        const rows = fixture.nativeElement.querySelectorAll('button[mat-list-item]');
        rows[0].querySelector('button[mat-icon-button]').click();

        expect(service.remove).toHaveBeenCalledOnceWith(0);
        expect(emitted).toBeUndefined();
    });
});
