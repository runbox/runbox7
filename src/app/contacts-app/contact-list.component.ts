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

import { Component, Input, EventEmitter, Output } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { Contact } from './contact';

type SelectionEvent = Set<string>;

@Component({
    selector: 'app-contact-list',
    styleUrls: ['contacts-app.component.scss'],
    templateUrl: './contact-list.component.html'
})
export class ContactListComponent {
    @Input() contacts: Contact[];

    @Input() categories: string[] = [];
    @Input() allowDragging = false;
    @Input() showDragHelpers = false;
    @Input() sideMenu: MatSidenav;

    @Output() selectionUpdated = new EventEmitter<SelectionEvent>();

    categoryFilter = 'RUNBOX:ALL';
    searchTerm  = '';
    shownContacts: Contact[];
    sortMethod = 'lastname+';

    selectingMultiple = false;
    selectedIDs: {[id: string]: boolean} = {};

    ngOnChanges() {
        this.filterContacts();
    }

    dragStarted(ev: DragEvent, contact: Contact) {
        if (this.allowDragging) {
            ev.dataTransfer.setData('contact', contact.id);
        } else {
            ev.preventDefault();
        }
    }

    filterContacts() {
        this.shownContacts = this.contacts.filter(c => {
            if (this.categoryFilter === 'RUNBOX:ALL') {
                return true;
            }
            if (this.categoryFilter === 'RUNBOX:NONE' && c.categories.length === 0) {
                return true;
            }

            const target = this.categoryFilter.substr(5); // strip 'USER:'

            return c.categories.find(g => g === target);
        }).filter(c => {
            return (c.display_name() || '').toLowerCase().indexOf(this.searchTerm.toLowerCase()) !== -1;
        });

        this.sortContacts();
    }

    onContactChecked(): void {
        const selection: SelectionEvent = new Set();
        for (const id in this.selectedIDs) {
            if (this.selectedIDs[id]) {
                selection.add(id);
            }
        }
        this.selectionUpdated.emit(selection);
    }

    onSelectMultipleChange(): void {
        if (!this.selectingMultiple) {
            // uncheck all contacts if we're switching this off to prevent confusing leftovers
            this.resetSelection();
        }
    }

    resetSelection(): void {
        this.selectedIDs = {};
        this.onContactChecked();
    }

    selectAll(): void {
        for (const c of this.shownContacts) {
            this.selectedIDs[c.id] = true;
        }
        this.onContactChecked();
    }

    sortContacts(): void {
        this.shownContacts.sort((a, b) => {
            let firstname_order: number;
            let lastname_order: number;

            // all this complexity is so that the null values are always treated
            // as last if they were alphabetically last
            if (a.first_name === b.first_name) {
                firstname_order = 0;
            } else if (!a.first_name) {
                firstname_order = 1;
            } else if (!b.first_name) {
                firstname_order = -1;
            } else {
                firstname_order = a.first_name.localeCompare(b.first_name);
            }

            if (a.last_name === b.last_name) {
                lastname_order = 0;
            } else if (!a.last_name) {
                lastname_order = 1;
            } else if (!b.last_name) {
                lastname_order = -1;
            } else {
                lastname_order = a.last_name.localeCompare(b.last_name);
            }

            if (this.sortMethod === 'lastname+') {
                return lastname_order || firstname_order;
            }

            if (this.sortMethod === 'lastname-') {
                return (1 - lastname_order) || (1 - firstname_order);
            }

            if (this.sortMethod === 'firstname+') {
                return firstname_order || lastname_order;
            }

            if (this.sortMethod === 'firstname-') {
                return (1 - firstname_order) || (1 - lastname_order);
            }
        });
    }
}
