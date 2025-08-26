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
import { BackgroundActivityService } from '../common/background-activity.service';

enum Activity {
    One = 'Activity One',
    Two = 'Activity Two',
}

@Component({
  template: `
<style>
.frame {
    border-style: dotted;
}
</style>

<table>
    <tr>
        <td>
            <button mat-button (click)="start(Activity.One)"> Start Activity One </button>
        </td>
        <td>
            <button mat-button (click)="end(Activity.One)"> Finish Activity One </button>
        </td>
    </tr>
    <tr>
        <td>
            <button mat-button (click)="start(Activity.Two)"> Start Activity Two </button>
        </td>
        <td>
            <button mat-button (click)="end(Activity.Two)"> Finish Activity Two </button>
        </td>
    </tr>
</table>

<div class="frame">
    <app-activity-indicator [activities]="activities.observable"></app-activity-indicator>
</div>
  `
})
export class ActivityIndicatorDemoComponent {
    activities = new BackgroundActivityService<Activity>();
    // for the template
    Activity = Activity;

    start(activity: Activity) {
        this.activities.begin(activity);
    }

    end(activity: Activity) {
        this.activities.end(activity);
    }
}
