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

import { Component, Input, OnChanges, Output, EventEmitter } from '@angular/core';

import { FilteredSender } from '../../rmmapi/rbwebmail';

@Component({
    selector: 'app-account-sender-list',
    templateUrl: './sender-list.component.html',
})
export class SenderListComponent implements OnChanges {
    @Input() senders: FilteredSender[];

    @Output() add:    EventEmitter<string> = new EventEmitter();
    @Output() remove: EventEmitter<any>    = new EventEmitter();

    senderList: FilteredSender[];

    ngOnChanges() {
        // adding a placeholder for the input field
        this.senderList = this.senders.concat({
            id:      null,
            address: '',
        });
    }
}
