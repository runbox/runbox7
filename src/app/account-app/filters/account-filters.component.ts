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

import { Component, QueryList, ViewChildren } from '@angular/core';
import { ReplaySubject, Subject } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Filter, RunboxWebmailAPI } from '../../rmmapi/rbwebmail';
import { take, debounceTime } from 'rxjs/operators';
import { FilterEditorComponent } from './filter-editor.component';

@Component({
    selector: 'app-account-filters-component',
    templateUrl: './account-filters.component.html',
})
export class AccountFiltersComponent {
    @ViewChildren(FilterEditorComponent) filterComponents: QueryList<FilterEditorComponent>;
    filters: ReplaySubject<Filter[]> = new ReplaySubject(1);
    shownFilters: Subject<Filter[]> = new Subject();
    filtersReordered: Subject<void> = new Subject();

    filterPageSize = 50;
    filtersShown = this.filterPageSize;
    filtersTotal: number;

    constructor(
        private rmmapi:   RunboxWebmailAPI,
        private snackbar: MatSnackBar,
    ) {
        this.rmmapi.getFilters().subscribe(filters => {
            this.filters.next(filters);
        });

        this.filters.subscribe(_ => this.updateShownFilters());

        this.filtersReordered.pipe(debounceTime(1500)).subscribe(() => {
            this.filters.pipe(take(1)).subscribe(filters => {
                const order = filters.map(f => f.id);
                this.rmmapi.reorderFilters(order).subscribe(() => {
                    console.log('Filters reordered');
                });
            });
        });
    }

    newFilter(): void {
        const template = {
            id: null,
            str: '',
            action: 't',
            active: true,
            target: 'Inbox',
            negated: false,
            location: '0',
            priority: -1,
        };
        this.updateFilters(
            filters => [template, ...filters]
        );
    }

    deleteFilter(target: Filter): void {
        if (target.id) {
            console.log(`Deleting filter #${target.id}`);
            this.rmmapi.deleteFilter(target).subscribe(
                () => console.log(`Filter #${target.id} deleted`),
            );
        }
        this.updateFilters(
            filters => filters.filter(f => f !== target)
        );
    }

    saveFilter(existing: Filter, replacement: Filter): void {
        console.log(`Uploading filter to server ${JSON.stringify(replacement)}`);
        this.rmmapi.saveFilter(replacement).subscribe(
            id => {
                replacement.id = id; // only needed when a new one is created, but no difference to us
                this.updateFilters(
                    filters => filters.map(f => {
                        if (f === existing) {
                            return replacement;
                        } else {
                            return f;
                        }
                    })
                );
            },
            _err => {
                const action = existing.id ? 'updating' : 'creating';
                const message = `Error ${action} filter. Try again or contact Runbox Support`;
                this.snackbar.open(message, 'Ok', {
                    duration: 3000,
                });
            },
        );
    }

    updateFilters(transform: (_: Filter[]) => Filter[]): void {
        this.filters.pipe(take(1)).subscribe(
            filters => this.filters.next(transform(filters))
        );
    }

    moveFilterUp(filter: Filter): void {
        this.updateFilters(filters => {
            const index = filters.findIndex(f => f === filter);
            if (index === 0) {
                return filters;
            }
            const head = filters.slice(0, index);
            let tail = filters.slice(index + 1);
            tail = [head.pop(), ...tail];
            setTimeout(() => this.hilightFilter(filter), 50);
            return [...head, filter, ...tail];
        });
        this.filtersReordered.next();
    }

    moveFilterDown(filter: Filter): void {
        this.updateFilters(filters => {
            const index = filters.findIndex(f => f === filter);
            if (index === filters.length - 1) {
                return filters;
            }
            const head = filters.slice(0, index);
            const tail = filters.slice(index + 1);
            setTimeout(() => this.hilightFilter(filter), 50);
            return [...head, tail.shift(), filter, ...tail];
        });
        this.filtersReordered.next();
    }

    hilightFilter(filter: Filter): void {
        this.filterComponents.find(fc => fc.filter === filter).hilight();
    }

    showAllFilters(): void {
        this.filtersShown = Number.MAX_SAFE_INTEGER;
        this.updateShownFilters();
    }

    showMoreFilters(): void {
        this.filtersShown += this.filterPageSize;
        this.updateShownFilters();
    }

    updateShownFilters(): void {
        this.filters.pipe(take(1)).subscribe(filters => {
            this.shownFilters.next(filters.slice(0, this.filtersShown));
            this.filtersTotal = filters.length;
        });
    }
}
