// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2019 Runbox Solutions AS (runbox.com).
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

import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { Subject } from 'rxjs';
import { RunboxCalendarEvent } from './runbox-calendar-event';
import * as moment from 'moment';

@Component({
    selector: 'app-calendar-overview',
    templateUrl: './calendar-overview.component.html',
})
export class CalendarOverviewComponent implements OnChanges, OnInit {
    @Input() events: RunboxCalendarEvent[];
    @Input() refresh: Subject<any>;

    @Output() editEvent: EventEmitter<RunboxCalendarEvent> = new EventEmitter();

    visible_events: RunboxCalendarEvent[] = [];
    event_limit = 5;

    ngOnChanges() {
        this.showUpcoming();
    }

    ngOnInit() {
        this.refresh.subscribe(_ => this.ngOnChanges());
    }

    showMore() {
        this.event_limit += 5;
    }

    showUpcoming() {
        const now = moment();
        this.visible_events = this.events.filter(e => {
            return e.dtstart.isAfter(now) || (e.dtend && e.dtend.isAfter(now));
        }).sort((a, b) => {
            return a.dtstart.isBefore(b.dtstart) ? -1 : 1;
        });
    }
}
