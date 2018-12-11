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

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { Contact } from '../contact';

@Component({
    selector: 'app-contactlist',
    templateUrl: './contactlist.component.html'
})
export class ContactListComponent {
    @Input() contacts: Contact[];

    @Output() contactSelected = new EventEmitter<Contact>();
    @Output() newContactClicked = new EventEmitter();

    constructor(
    ) {
    }

    selectContact(contact: Contact): void {
        this.contactSelected.next(contact);
    }

    newContact(): void {
        this.newContactClicked.next(null);
    }
}
