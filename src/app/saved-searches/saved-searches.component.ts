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

import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';
import { SavedSearch, SavedSearchesService } from './saved-searches.service';

@Component({
    selector: 'app-saved-searches',
    templateUrl: './saved-searches.component.html',
    styleUrls: ['./saved-searches.component.css']
})
export class SavedSearchesComponent implements OnInit {
    @Input() expanded = false;
    @Output() searchClicked: EventEmitter<string> = new EventEmitter();

    searches: SavedSearch[] = [];

    constructor(
        private service: SavedSearchesService,
    ) { }

    ngOnInit(): void {
        this.service.searches.subscribe(entries => this.searches = entries);
    }

    remove(index: number): void {
        this.service.remove(index);
    }
}
