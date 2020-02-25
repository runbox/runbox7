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
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import {
  SecurityContext,
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  NgZone,
  ViewChild,
  AfterViewInit,
  ContentChild,
  ElementRef,
  TemplateRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MatCardModule,
  MatCheckboxModule,
  MatDialogModule,
  MatExpansionModule,
  MatInputModule,
  MatListModule,
  MatPaginatorModule,
  MatProgressBarModule,
  MatProgressSpinnerModule,
  MatSelectModule,
  MatTableModule,
  MatTabsModule,
  MatChipsModule,
  MatDialog,
  MatPaginator,
  MatGridListModule,
} from '@angular/material';
import { AsyncSubject, Observable, Subject } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import * as moment from 'moment';

@Component({
    selector: 'app-runbox-timer',
    styles: [`
    `],
    template: `
        <ng-container><span #ref><ng-content select="[custom_template]"></ng-content></span></ng-container>
        <ng-container *ngIf="ref.childNodes.length == 0">
            <span class="timeunit years" *ngIf="years">{{years}} years,</span>
            <span class="timeunit months" *ngIf="months"> {{months}} months,</span>
            <span class="timeunit days" *ngIf="days"> {{days}} days,</span>
            <span class="timeunit hours"> {{hours}} hours,</span>
            <span class="timeunit minutes"> {{minutes}} minutes, and </span>
            <span class="timeunit seconds"> {{seconds}} seconds</span>
        </ng-container>
    `
})

export class RunboxTimerComponent implements OnInit {
  @ContentChild('custom_template', { static: false }) custom_template: ElementRef;

  user_created = new AsyncSubject<number>();

  constructor(
      public dialog: MatDialog,
      public ref: ElementRef,
      private rmmapi: RunboxWebmailAPI,
  ) {

  }

  ngOnInit() {
      this.recalculate_date();
      this.rmmapi.me.subscribe(me => {
          this.user_created = me.user_created;
      });
  }

  recalculate_date () {

      console.log('HABA');

      let now = moment();
      // let tomorrow = moment().add(1, 'days');
      // tomorrow.subtract(7654, 'seconds'); // for a little variety ;)

      let expiration = moment(this.user_created); // Need this from API
      let duration = moment.duration(expiration.diff(now));
      let limitedTimeOffer = (duration > 0 ? duration : null);
      
      console.log(`
        days:    ${duration.days()}
        hours:   ${duration.hours()}
        minutes: ${duration.minutes()}
        seconds: ${duration.seconds()}
      `.trim());
  }
}
