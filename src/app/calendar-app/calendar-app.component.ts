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

import {
    Component,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    OnDestroy,
    ViewChild,
} from '@angular/core';

import { ActivatedRoute } from '@angular/router';

import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
    isSameDay,
    isSameMonth,
} from 'date-fns';

import * as moment from 'moment';

import { Subject } from 'rxjs';

import {
    CalendarDayViewBeforeRenderEvent,
    CalendarEvent,
    CalendarEventTimesChangedEvent,
    CalendarEventTitleFormatter,
    CalendarMonthViewBeforeRenderEvent,
    CalendarView,
    CalendarWeekViewBeforeRenderEvent,
} from 'angular-calendar';
import { ViewPeriod } from 'calendar-utils';
import RRule from 'rrule';

import { CalendarService } from './calendar.service';
import { CalendarSettings } from './calendar-settings';

import { RunboxCalendar } from './runbox-calendar';
import { RunboxCalendarEvent } from './runbox-calendar-event';
import { EventEditorDialogComponent } from './event-editor-dialog.component';
import { ImportDialogComponent } from './import-dialog.component';
import { CalendarEditorDialogComponent } from './calendar-editor-dialog.component';
import { CalendarSettingsDialogComponent } from './calendar-settings-dialog.component';
import { EventTitleFormatter } from './event-title-formatter';

@Component({
    selector: 'app-calendar-app-component',
    templateUrl: './calendar-app.component.html',
    providers: [
        { provide: CalendarEventTitleFormatter, useClass: EventTitleFormatter }
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarAppComponent implements OnDestroy {
    view: CalendarView = CalendarView.Month;
    CalendarView = CalendarView;
    viewDate: Date = new Date();
    viewPeriod: ViewPeriod;
    activeDayIsOpen = false;
    settings = new CalendarSettings();

    refresh: Subject<any> = new Subject();
    viewRefreshInterval: any;

    @ViewChild('icsUploadInput', { static: false }) icsUploadInput: any;

    calendars: RunboxCalendar[] = [];

    events:       RunboxCalendarEvent[] = [];
    shown_events: RunboxCalendarEvent[] = [];

    constructor(
        public  calendarservice: CalendarService,
        private cdr:      ChangeDetectorRef,
        private dialog:   MatDialog,
        private http:     HttpClient,
        private route:    ActivatedRoute,
        private snackBar: MatSnackBar,
    ) {
        const storedSettings = localStorage.getItem('calendarSettings');
        if (storedSettings) {
            this.settings = JSON.parse(storedSettings) as CalendarSettings;
        }
        this.calendarservice.errorLog.subscribe(e => this.showError(e));
        this.calendarservice.calendarSubject.subscribe((calendars) => {
            this.calendars = calendars;
            this.updateEventColors();
            // see if we're told to import some email-ICS
            this.route.queryParams.subscribe(params => {
                const icsUrl = params.import_from;
                if (!icsUrl)  { return; }
                this.http.get(icsUrl, { responseType: 'blob' }).subscribe((res) => {
                    (new Response(res).text().then(text => {
                        this.processIcsImport(text);
                    }));
                });
            });
        });
        this.calendarservice.eventSubject.subscribe(events => {
            this.events = events;
            console.log('Processed events:', this.events);
            this.updateEventColors();
            this.filterEvents();
        });

        // force re-render to update the last update string
        this.viewRefreshInterval = setInterval(() => {
            this.cdr.markForCheck();
        }, 60 * 1000);
    }

    ngOnDestroy() {
        clearInterval(this.viewRefreshInterval);
    }

    addEvent(on?: Date): void {
        const dialogRef = this.dialog.open(EventEditorDialogComponent, { data: { calendars: this.calendars, start: on } });
        dialogRef.afterClosed().subscribe(event => {
            console.log('Dialog result:', event);
            if (event) {
                this.calendarservice.addEvent(event);
            }
        });
    }
    beforeViewRender(viewRender:
        | CalendarMonthViewBeforeRenderEvent
        | CalendarWeekViewBeforeRenderEvent
        | CalendarDayViewBeforeRenderEvent,
    ): void {
        if (
          this.viewPeriod &&
          this.viewPeriod.start.valueOf() === viewRender.period.start.valueOf() &&
          this.viewPeriod.end.valueOf() === viewRender.period.end.valueOf()
        ) {
            return;
        }
        this.viewPeriod = viewRender.period;
        this.filterEvents();
    }

    calculateRecurringEvents(): void {
        if (!this.viewPeriod) {
            return;
        }

        const events = [];

        for (const e of this.shown_events) {
            if (!e.rrule) {
                events.push(e);
                continue;
            }

            let duration: moment.Duration;
            if (e.end) {
                duration = moment.duration(moment(e.end).diff(e.dtstart));
            }

            for (const dt of e.rrule.between(this.viewPeriod.start, this.viewPeriod.end)) {
                const copy = e.clone();
                copy.start = dt;
                if (duration) {
                    copy.end = moment(copy.start).add(duration).toDate();
                }
                events.push(copy);
            }
        }

        this.shown_events = events;
        // needed so that beforeViewRender handler knows that something happened
        this.cdr.detectChanges();
    }

    dayClicked({ date, events }: { date: Date; events: CalendarEvent[] }): void {
        if (isSameMonth(date, this.viewDate)) {
            this.viewDate = date;
            if ((isSameDay(this.viewDate, date) && this.activeDayIsOpen ) || events.length === 0) {
                this.activeDayIsOpen = false;
            } else {
                this.activeDayIsOpen = true;
            }
        }
    }

    editCalendar(calendar_id: string): void {
        let cal = this.calendars.find(c => c.id === calendar_id);
        // edit a copy so that edit cancellation is possible
        cal = new RunboxCalendar(cal);

        const dialogRef = this.dialog.open(CalendarEditorDialogComponent, { data: cal });
        dialogRef.afterClosed().subscribe(result => {
            if (!result) {
                return;
            }
            console.log('Dialog result:', result);
            if (result === 'DELETE') {
                this.calendarservice.deleteCalendar(cal.id);
            } else {
                this.calendarservice.modifyCalendar(result);
            }
        });
    }

    eventTimesChanged({ event, newStart, newEnd }: CalendarEventTimesChangedEvent): void {
        event.start = newStart;
        event.end = newEnd;
        console.log('Event changed', event);
        this.calendarservice.modifyEvent(event as RunboxCalendarEvent);
    }

    filterEvents(): void {
        if (this.calendars.length === 0) {
            console.log('Calendars not loaded yet, showing all events');
            this.shown_events = this.events;
        } else {
            const visible = {};
            for (const c of this.calendars) {
                visible[c.id] = c.shown;
            }

            this.shown_events = [];
            for (const e of this.events) {
                if (visible[e.calendar]) {
                    this.shown_events.push(e);
                }
            }
        }

        this.calculateRecurringEvents();
        this.refresh.next();
    }

    importEventClicked(): void {
        this.icsUploadInput.nativeElement.click();
    }

    importEvents(calendarId: string, ics: string): void {
        this.calendarservice.importCalendar(calendarId, ics).subscribe(res => {
            this.showInfo(res['events_imported'] + ' events imported');
        });
    }

    onIcsUploaded(uploadEvent: any) {
        const file = uploadEvent.target.files[0];
        const fr   = new FileReader();

        fr.onload = (ev: any) => {
            const ics = ev.target.result;
            console.log(ics);
            this.processIcsImport(ics);
        };

        fr.readAsText(file);
    }

    openEvent(event: CalendarEvent): void {
        console.log('Opening event', event);
        const dialogRef = this.dialog.open(EventEditorDialogComponent, {
            data: { event: (event as RunboxCalendarEvent).clone(), calendars: this.calendars }
        });
        dialogRef.afterClosed().subscribe(result => {
            if (result === 'DELETE') {
                this.calendarservice.deleteEvent(event.id as string);
            } else if (result) {
                this.calendarservice.modifyEvent(result);
            }
        });
    }

    openSettings(): void {
        const dialogRef = this.dialog.open(CalendarSettingsDialogComponent, { data: this.settings });
        dialogRef.afterClosed().subscribe(result => {
            localStorage.setItem('calendarSettings', JSON.stringify(this.settings));
            // we need to do this weird dance to make the calendar pick up
            // potential changes to settings.weekStartsOnSunday
            const desiredView = this.view;
            this.view = null;
            setTimeout(() => this.view = desiredView);
        });
    }

    processIcsImport(ics: string) {
        const dialogRef = this.dialog.open(ImportDialogComponent, {
            data: { ical: ics, calendars: this.calendars.slice() }
        });
        dialogRef.afterClosed().subscribe(result => {
            if (result instanceof RunboxCalendar) {
                // create the new calendar first
                this.calendarservice.addCalendar(result).then(
                    () => this.importEvents(result.id, ics)
                );
            } else {
                this.importEvents(result, ics);
            }
        });
    }

    showAddCalendarDialog(): void {
        const dialogRef = this.dialog.open(CalendarEditorDialogComponent);
        dialogRef.afterClosed().subscribe(result => {
            console.log('Dialog result:', result);
            if (!result) { return; }

            result.generateID();
            this.calendarservice.addCalendar(result);
        });
    }

    showError(e: HttpErrorResponse): void {
        let message = '';

        if (e.status === 500) {
            message = 'Internal server error';
        } else {
            console.log('Error ' + e.status +  ': ' + e.message);
        }

        if (message) {
            this.snackBar.open(message, 'Ok :(', {
                duration: 5000,
            });
        }
    }

    showInfo(message: string): void {
        this.snackBar.open(message, 'Ok', {
            duration: 3000,
        });
    }

    toggleCalendar(calendar_id: string): void {
        const cal = this.calendars.find(c => c.id === calendar_id);
        cal.shown = !cal.shown;
        this.filterEvents();
    }

    updateEventColors(): void {
        const calendar_color = {};
        for (const c of this.calendars) {
            calendar_color[c.id] = c.color;
        }

        for (const e of this.events) {
            e.color.primary = calendar_color[e.calendar];
        }
    }
}
