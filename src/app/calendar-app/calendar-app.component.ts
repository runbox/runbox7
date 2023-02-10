// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2021 Runbox Solutions AS (runbox.com).
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

import { ActivatedRoute, Router } from '@angular/router';

import { HttpClient } from '@angular/common/http';

import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MatSidenav } from '@angular/material/sidenav';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';

import { isSameDay, } from 'date-fns';

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

import { CalendarService } from './calendar.service';
import { CalendarSettings } from './calendar-settings';
import { MobileQueryService } from '../mobile-query.service';
import { UsageReportsService } from '../common/usage-reports.service';

import { RunboxCalendar } from './runbox-calendar';
import { RunboxCalendarEvent } from './runbox-calendar-event';
import { RunboxCalendarView } from './runbox-calendar-view';
import { EventEditorDialogComponent } from './event-editor-dialog.component';
import { ImportDialogComponent } from './import-dialog.component';
import { CalendarEditorDialogComponent } from './calendar-editor-dialog.component';
import { CalendarSettingsDialogComponent } from './calendar-settings-dialog.component';
import { EventTitleFormatter } from './event-title-formatter';

import '../sentry';

@Component({
    selector: 'app-calendar-app-component',
    templateUrl: './calendar-app.component.html',
    styleUrls: ['calendar-app.component.scss'],
    providers: [
        { provide: CalendarEventTitleFormatter, useClass: EventTitleFormatter }
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarAppComponent implements OnDestroy {
    mwlView = CalendarView.Month;
    view: RunboxCalendarView = RunboxCalendarView.Month;
    // needed so that angular templates know what this name means
    readonly RunboxCalendarView: typeof RunboxCalendarView = RunboxCalendarView;

    CalendarView = CalendarView;
    viewDate: Date = new Date();
    viewPeriod: ViewPeriod;
    activeDayIsOpen = false;
    sideMenuOpened = true;
    settings = new CalendarSettings({});

    refresh: Subject<any> = new Subject();
    viewRefreshInterval: any;

    @ViewChild(MatSidenav) sideMenu: MatSidenav;
    @ViewChild('icsUploadInput') icsUploadInput: any;

    calendars: RunboxCalendar[] = [];
    calendarVisibility = {};

    events:       RunboxCalendarEvent[] = [];
    shown_events: RunboxCalendarEvent[] = [];

    constructor(
        public  calendarservice: CalendarService,
        private cdr:      ChangeDetectorRef,
        private dialog:   MatDialog,
        private http:     HttpClient,
        public  mobileQuery: MobileQueryService,
        private route:    ActivatedRoute,
        private router:   Router,
        private snackBar: MatSnackBar,
        private usage:    UsageReportsService,
    ) {
        const storedSettings = localStorage.getItem('calendarSettings');
        if (storedSettings) {
            this.settings = new CalendarSettings(JSON.parse(storedSettings));
            this.setView(this.settings.lastUsedView);
        }
        this.calendarservice.errorLog.subscribe(e => this.showError(e));
        this.calendarservice.calendarSubject.subscribe((calendars) => {
            this.calendars = calendars.sort((a, b) => a.displayname.localeCompare(b.displayname));
            for (const c of this.calendars) {
                if (this.calendarVisibility[c.id] === undefined) {
                    this.calendarVisibility[c.id] = true;
                }
            }
            this.updateEventColors();
            this.cdr.markForCheck();
            // see if we're told to import some email-ICS
            this.route.queryParams.subscribe(params => {
                const icsUrl = params.import_from;
                if (!icsUrl)  { return; }
                this.http.get(icsUrl, { responseType: 'blob' }).subscribe((res) => {
                    (new Response(res).text().then(text => {
                        this.processIcsImport(text);
                    }));
                });
                this.router.navigate(['/calendar'], { queryParams: {}, replaceUrl: true });
            });
        });
        this.calendarservice.eventSubject.subscribe(events => {
            this.events = events;
            this.updateEventColors();
            this.filterEvents();
        });

        // force re-render to update the last update string
        this.viewRefreshInterval = setInterval(() => {
            this.cdr.markForCheck();
        }, 60 * 1000);

        this.sideMenuOpened = !mobileQuery.matches;
        this.mobileQuery.changed.subscribe(mobile => {
            this.sideMenuOpened = !mobile;
            this.cdr.markForCheck();
        });
        this.usage.report('calendar');
    }

    ngOnDestroy() {
        clearInterval(this.viewRefreshInterval);
    }

    addEvent(on?: Date): void {
        // setup new event
        const new_event = RunboxCalendarEvent.newEmpty(this.calendarservice.me.timezone);
        new_event.timezone = this.calendarservice.me.timezone;
        const dialogRef = this.dialog.open(EventEditorDialogComponent, {
            data: { event: new_event, calendars: this.calendars, settings: this.settings, start: on, is_new: true } }
        );
        dialogRef.afterClosed().subscribe(event => {
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
        this.calendarservice.updateEventList(this.viewPeriod);
    }

    dayClicked({ date, events }: { date: Date; events: CalendarEvent[] }): void {
        this.viewDate = date;
        if ((isSameDay(this.viewDate, date) && this.activeDayIsOpen ) || events.length === 0) {
            this.activeDayIsOpen = false;
        } else {
            this.activeDayIsOpen = true;
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
        this.calendarservice.modifyEvent(event as RunboxCalendarEvent);
    }

    filterEvents(): void {
        if (this.calendars.length === 0) {
            this.shown_events = this.events;
        } else {
            this.shown_events = [];
            for (const e of this.events) {
                if (this.calendarVisibility[e.calendar]) {
                    this.shown_events.push(e);
                }
            }
        }
        this.shown_events = this.shown_events.sort(
            (ea, eb) => ea.start.getTime() < eb.start.getTime() ? -1 : 1);

        // else nothing actually visually changes until the next sync!
        this.cdr.detectChanges();
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

        if (file.type !== 'text/calendar') {
            this.showError('Error parsing calendar: is it a proper ICS file?');
            return;
        }

        fr.onload = (ev: any) => {
            const ics = ev.target.result;
            this.processIcsImport(ics);
        };

        fr.readAsText(file);
    }

    openEvent(event: CalendarEvent): void {
        const target = event as RunboxCalendarEvent;
        const dialogRef = this.dialog.open(EventEditorDialogComponent, {
            data: { event: target, calendars: this.calendars, settings: this.settings, is_new: false }
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
            this.cdr.markForCheck();
        });
    }

    processIcsImport(ics: string) {
        const dialogRef = this.dialog.open(ImportDialogComponent, {
            data: { ical: ics, calendars: this.calendars.slice() }
        });
        dialogRef.afterClosed().subscribe(result => {
            if (!result) {
                return;
            }

            const methodMatch = ics.match(/^METHOD:(.+)$/mi);
            if (methodMatch) {
                // Ideally we'd (try to) notify the other party that we accept the invitation,
                // or something. For now, let's just import it since that's what the user expects.
                ics = ics.replace(/^METHOD:(.+)$/mi, '');
            }

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

    setView(view: RunboxCalendarView): void {
        this.view = view;
        this.settings.lastUsedView = this.view;
        localStorage.setItem('calendarSettings', JSON.stringify(this.settings));

        switch (this.view) {
            case RunboxCalendarView.Overview: {
                this.mwlView = null;
                break;
            }
            case RunboxCalendarView.Month: {
                this.mwlView = CalendarView.Month;
                break;
            }
            case RunboxCalendarView.Week: {
                this.mwlView = CalendarView.Week;
                break;
            }
            case RunboxCalendarView.Day: {
                this.mwlView = CalendarView.Day;
                break;
            }
        }
    }

    showAddCalendarDialog(): void {
        const dialogRef = this.dialog.open(CalendarEditorDialogComponent);
        dialogRef.afterClosed().subscribe(result => {
            if (!result) { return; }

            result.generateID();
            this.calendarservice.addCalendar(result);
        });
    }

    showError(e: any): void {
        let message = '';

        if (typeof e === 'string') {
            message = e;
        } else if (e.error.error) {
            message = e.error.error;
        } else if (e.status === 500) {
            message = 'Internal server error';
        } else {
            message = 'Error ' + e.status +  ': ' + e.message;
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
        this.calendarVisibility[calendar_id] = !this.calendarVisibility[calendar_id];
        this.calendarservice.updateEventList(this.viewPeriod);
        this.cdr.markForCheck();
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
