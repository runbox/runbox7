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
import {
  Component,
  Input,
  ContentChild,
  ElementRef,
  OnInit
} from '@angular/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { RMM } from '../rmm';

@Component({
    selector: 'app-runbox-timer',
    styles: [`

    `],
    template: `
    <div class="app-runbox-timer" [ngClass]="css_class">
        <ng-container><span #ref><ng-content select="[custom_template]"></ng-content></span></ng-container>
        <ng-container *ngIf="ref.childNodes.length == 0">
            <div>
              <div class="timeunit years" *ngIf="years">{{years}}</div>
              <div class="timeunit months" *ngIf="months">{{months}}</div>
              <div class="timeunit days" *ngIf="months">{{days}}</div>
              <div class="timeunit hours">{{hours}}</div>
              <div class="timeunit minutes" >{{minutes}}</div>
              <div class="timeunit seconds" >{{seconds}}</div>
            </div>
        </ng-container>
    </div>
    `
})

export class RunboxTimerComponent implements OnInit {
  @ContentChild('custom_template', { static: false }) custom_template: ElementRef;
  @Input() future_date: any; // yyyy/mm/dd hh:mm:ss
  @Input() css_class: any; // cool_timer_css
  @Input() child_timer: any = {years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0};

  years: any;
  months: any;
  days: any;
  hours: any;
  minutes: any;
  seconds: any;

  has_time_left = true;
  constructor(
    public dialog: MatDialog,
    public rmm: RMM,
    public snackBar: MatSnackBar,
    public ref: ElementRef,
  ) {
  }

  ngOnInit() {
      this.recalculate_date();
  }

  recalculate_date () {
      const now = new Date();
      const d = this.future_date;
      const year  = d.split(' ')[0].split('/')[0];
      const month = Number(d.split(' ')[0].split('/')[1]) - 1;
      const day   = Number(d.split(' ')[0].split('/')[2]);
      const hour  = Number(d.split(' ')[1].split(':')[0]);
      const min   = Number(d.split(' ')[1].split(':')[1]);
      const sec   = Number(d.split(' ')[1].split(':')[2]);
      const sometime = new Date(year, month, day, hour, min, sec, 0);
      let total_seconds = Math.floor((sometime.getTime() - now.getTime()) / 1000);
      if ( total_seconds < 0 ) { this.has_time_left = false; return ; }
      setTimeout(() => {
          this.recalculate_date();
      }, 1000);
      const secs_per_year = (365 * 24 * 60 * 60);
      this.years = Math.floor(total_seconds / secs_per_year);
      total_seconds -= secs_per_year * this.years;
      const secs_per_month = 30 * 24 * 60 * 60;
      this.months = Math.floor(total_seconds / secs_per_month);
      total_seconds -= secs_per_month * this.months;
      const secs_per_day = 24 * 60 * 60;
      this.days = Math.floor(total_seconds / secs_per_day);
      total_seconds -= secs_per_day * this.days;
      const secs_per_hour = 60 * 60;
      this.hours = Math.floor(total_seconds / secs_per_hour);
      total_seconds -= secs_per_hour * this.hours;
      const secs_per_minutes = 60;
      this.minutes = Math.floor(total_seconds / secs_per_minutes);
      total_seconds -= secs_per_minutes * this.minutes;
      this.seconds = total_seconds;

      ['years', 'months', 'days', 'hours', 'minutes', 'seconds'].forEach((t) => {
        this.child_timer[t] = this[t];
      });

     // console.log(` ${years} years, ${months} months, ${days} days, ${hours} hours, ${minutes} minutes, ${secs} seconds to go`)
  }
}

