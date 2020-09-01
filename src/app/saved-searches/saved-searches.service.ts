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

import { Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { take } from 'rxjs/operators';

import { StorageService } from '../storage.service';
import {RunboxWebmailAPI} from '../rmmapi/rbwebmail';

export interface SavedSearch {
    name: string;
    query: string;
}

export interface SavedSearchStorage {
    version: number;
    entries: SavedSearch[];
}

@Injectable({ providedIn: 'root' })
export class SavedSearchesService {
    version = 0;
    searches: ReplaySubject<SavedSearch[]> = new ReplaySubject(1);

    constructor(
        private storage: StorageService,
        private rmmapi: RunboxWebmailAPI,
    ) {
        this.storage.get('saved-searches').then((searchdata: SavedSearchStorage) => {
            if (!searchdata) {
                this.searches.next([]);
                return;
            }
            this.searches.next(searchdata.entries);
            this.version = searchdata.version;
        });
        this.rmmapi.getSavedSearches().subscribe(searchdata => {
            this.applySyncedData(searchdata);
        });
    }

    add(entry: SavedSearch): void {
        this.searches.pipe(take(1)).subscribe(entries => {
            entries.push(entry);
            this.updateEntries(entries);
        });
    }

    remove(index: number): void {
        this.searches.pipe(take(1)).subscribe(entries => {
            const newEntries = entries.filter((_, i) => i !== index);
            this.updateEntries(newEntries);
        });
    }

    private updateEntries(entries: SavedSearch[]): void {
        this.searches.next(entries);
        this.version++;
        this.storage.set('saved-searches', {
            version: this.version,
            entries: entries,
        });
        this.uploadSeachData();
    }

    private async uploadSeachData() {
        const data: SavedSearchStorage = {
            version: this.version,
            entries: await this.searches.pipe(take(1)).toPromise(),
        };
        this.rmmapi.setSavedSearches(data).subscribe(
            newData => this.applySyncedData(newData)
        );
    }

    private applySyncedData(searchdata: SavedSearchStorage): void {
        if (searchdata.version < this.version) {
            this.uploadSeachData();
        }
        if (searchdata.version > this.version) {
            this.searches.next(searchdata.entries);
            this.version = searchdata.version;
        }
    }
}
