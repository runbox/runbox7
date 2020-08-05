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

import { Component, Input, OnChanges } from '@angular/core';
import { Observable } from 'rxjs';
import { ActivityProgress } from './background-activity.service';

@Component({
    selector: 'app-activity-indicator',
    template: `
<div>
    <app-runbox-loading *ngFor="let activity of shownActivities"
        [text]="activity"
        size="tiny"
    ></app-runbox-loading>
</div>
    `,
})
export class BackgroundActivityIndicatorComponent implements OnChanges {
    @Input() activities: Observable<Map<any, ActivityProgress>>;

    shownActivities: string[] = [];

    ngOnChanges() {
        this.activities.subscribe(activityMap => {
            this.shownActivities = [];
            activityMap.forEach((progress: ActivityProgress, activity: any) => {
                let description = activity.toString();
                if (progress[1] !== 1) {
                    description += ` ${progress[0] + 1}/${progress[1]}`;
                }
                this.shownActivities.push(description);
            });
        });
    }
}
