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
