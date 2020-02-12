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

import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { RunboxCalendarEvent } from './runbox-calendar-event';
import * as moment from 'moment';

class EventOverview {
    ongoing: boolean;

    constructor(public event: RunboxCalendarEvent) {
        if (event.dtstart.isBefore(moment()) && event.dtend.isAfter(moment())) {
            this.ongoing = true;
        }
    }

    get title(): string {
        return this.event.title;
    }

    get dtstart(): moment.Moment {
        return this.event.dtstart;
    }

    get dtend(): moment.Moment {
        return this.event.dtend;
    }

    get recurringFrequency(): string {
        // titlecase
        const freq = this.event.recurringFrequency;
        return freq.charAt(0).toUpperCase() + freq.slice(1).toLowerCase();
    }

    get location(): string {
        return this.event.location;
    }

    get description(): string {
        return this.event.description;
    }
}

@Component({
    selector: 'app-calendar-event-card',
    templateUrl: './calendar-event-card.component.html',
})
export class CalendarEventCardComponent implements OnChanges {
    @Input() event: RunboxCalendarEvent;
    @Input() editable = false;

    @Output() edit = new EventEmitter();

    e: EventOverview;

    constructor() { }

    ngOnChanges() {
        this.e = new EventOverview(this.event);
    }
}
