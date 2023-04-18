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

import { CommonModule } from '@angular/common';
import { NgModule, ErrorHandler } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SentryErrorHandler } from '../sentry-error-handler';
import { RunboxCommonModule } from '../common/common.module';

import { MenuModule } from '../menu/menu.module';

import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';

import { CalendarService } from './calendar.service';
import { CalendarAppComponent } from './calendar-app.component';
import { CalendarEditorDialogComponent } from './calendar-editor-dialog.component';
import { CalendarOverviewComponent } from './calendar-overview.component';
import { CalendarSettingsDialogComponent } from './calendar-settings-dialog.component';
import { ColorSelectorDialogComponent } from './color-selector-dialog.component';
import { DeleteConfirmationDialogComponent } from './delete-confirmation-dialog.component';
import { EventEditorDialogComponent } from './event-editor-dialog.component';
import { ImportDialogComponent } from './import-dialog.component';
import { OwlDateTimeModule, OwlNativeDateTimeModule, OWL_DATE_TIME_FORMATS } from '@danielmoncada/angular-datetime-picker';
import { OwlMomentDateTimeModule } from '@danielmoncada/angular-datetime-picker-moment-adapter';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatLegacyTabsModule as MatTabsModule } from '@angular/material/legacy-tabs';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { CalendarEventCardComponent } from './calendar-event-card.component';

// See https://momentjs.com/docs/#/displaying/format/
export const MOMENT_FORMATS = {
    parseInput: 'l LT',
    fullPickerInput: 'l LT',
    datePickerInput: 'l',
    timePickerInput: 'LT',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
};

@NgModule({
    declarations: [
        CalendarAppComponent,
        CalendarOverviewComponent,
        CalendarEditorDialogComponent,
        CalendarSettingsDialogComponent,
        ColorSelectorDialogComponent,
        DeleteConfirmationDialogComponent,
        EventEditorDialogComponent,
        ImportDialogComponent,
        CalendarEventCardComponent,
    ],
    imports: [
        CommonModule,
        RunboxCommonModule,
        FormsModule,
        MenuModule,
        MatButtonModule,
        MatCardModule,
        MatCheckboxModule,
        MatDatepickerModule,
        MatDialogModule,
        MatTabsModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatListModule,
        MatProgressSpinnerModule,
        MatSelectModule,
        MatSidenavModule,
        MatToolbarModule,
        MatTooltipModule,
        ReactiveFormsModule,
        OwlDateTimeModule,
        OwlNativeDateTimeModule,
        OwlMomentDateTimeModule,
        // angular-calendar stuff
        CalendarModule.forRoot({
            provide: DateAdapter,
            useFactory: adapterFactory
        }),
        RouterModule.forChild([{ path: '', component: CalendarAppComponent }])
    ],
    providers: [
        CalendarService,
        { provide: ErrorHandler, useClass: SentryErrorHandler },
        { provide: OWL_DATE_TIME_FORMATS, useValue: MOMENT_FORMATS }
    ],
    bootstrap: []
})

export class CalendarAppModule { }
