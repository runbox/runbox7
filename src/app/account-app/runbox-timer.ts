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
import {
  Component,
  OnInit,
  ContentChild,
  ElementRef,
  Input,
  Output,
  EventEmitter
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import moment from 'moment';

@Component({
    selector: 'app-runbox-timer',
    styles: [`
    `],
    template: `
        <ng-container><span #ref><ng-content select="[custom_template]"></ng-content></span></ng-container>
        <ng-container *ngIf="ref.childNodes.length == 0">
            <span class="timeunit years" *ngIf="runningDuration.years() > 0">{{runningDuration.years()}} years,</span>
            <span class="timeunit months" *ngIf="runningDuration.months() > 0"> {{runningDuration.months()}} months,</span>
            <span class="timeunit days" *ngIf="runningDuration.days() > 0"> {{runningDuration.days()}} days,</span>
            <span class="timeunit hours"> {{runningDuration.hours()}} hours,</span>
            <span class="timeunit minutes"> {{runningDuration.minutes()}} minutes, and </span>
            <span class="timeunit seconds"> {{runningDuration.seconds()}} seconds</span>
        </ng-container>
    `
})

export class RunboxTimerComponent implements OnInit {
  @ContentChild('custom_template', { static: false }) custom_template: ElementRef;

  @Input() user_created: moment.Moment;
  @Input() timer_length: number;

  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onFinished: EventEmitter<boolean> = new EventEmitter();
  runningDuration: moment.Duration;

  constructor(
      public dialog: MatDialog,
      public ref: ElementRef,
  ) {
      this.recalculate_date();
      setTimeout(() => this.recalculate_date(), 1000);
  }

  ngOnInit() {
      console.log('oninit runbox-timer');
  }

  recalculate_date () {
      const now = moment();
      const running_for = this.timer_length - now.diff(this.user_created);

      this.runningDuration = moment.duration(running_for);
      if (running_for <= 0 && this.onFinished) {
          this.onFinished.emit();
      }
      setTimeout(() => this.recalculate_date(), 1000);
  }
}
