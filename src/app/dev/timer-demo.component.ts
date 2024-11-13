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

import { Component } from '@angular/core';

@Component({
  template: `
<div>
    <div class='synopsis'>
        <h1>Runbox Timer</h1>
        <p>
            The runbox timer is a countdown timer. It expects a predefined date in the future and will make the calculations necessary to represent in a countdown timer.
        </p>
    </div>
    <div class='examples'>
        <h2>Standard timer with css style</h2>
        <app-runbox-timer future_date="2021/01/19 23:24:14" class="nice_blue_timer"></app-runbox-timer>
    </div>
    <div class='examples'>
        <h2>Standard timer with css style</h2>
        <app-runbox-timer future_date="2020/12/08 00:44:11" class="nice_green_timer"></app-runbox-timer>
    </div>
    <div class='examples'>
        <h2>Custom timer template</h2>
        <app-runbox-timer
            class="timer-custom-tpl"
            future_date="2025/02/18 01:14:41"
            [child_timer]="child_timer"
        >
            <div custom_template>
                <div>
                  <div class='date'>
                      <div class="timeunit y" *ngIf="child_timer.years">{{child_timer.years}}</div>
                      <div class="timeunit m" *ngIf="child_timer.months">{{child_timer.months}}</div>
                      <div class="timeunit d" *ngIf="child_timer.months">{{child_timer.days}}</div>
                  </div>
                  <div class='time'>
                      <div class="timeunit h">{{child_timer.hours < 10 ? '0'+child_timer.hours : child_timer.hours}}</div>
:
                      <div class="timeunit m" >{{child_timer.minutes < 10 ? '0'+child_timer.minutes : child_timer.minutes}}</div>
:
                      <div class="timeunit s" >{{child_timer.seconds < 10 ? '0'+child_timer.seconds : child_timer.seconds}}</div>
                  </div>
                </div>
            </div>
        </app-runbox-timer>
    </div>
</div>
  `
})
export class TimerDemoComponent {
  child_timer: any = {};
}
