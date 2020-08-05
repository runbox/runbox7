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

import { Subject } from 'rxjs';

// a glorified fraction
export type ActivityProgress = [number, number];

// not @Injectable on purpose: each app/service is expected to have its own,
// implemented with its own relevant type
export class BackgroundActivityService<ActivityType> {
    activityMap = new Map<ActivityType, ActivityProgress>();
    observable  = new Subject<Map<ActivityType, ActivityProgress>>();

    public begin(activity: ActivityType, parts = 1) {
        const existingProgress = this.activityMap.get(activity);
        if (existingProgress) {
            existingProgress[1] += parts;
            this.activityMap.set(activity, existingProgress);
        } else {
            this.activityMap.set(activity, [0, parts]);
        }
        this.observable.next(this.activityMap);
    }

    public end(activity: ActivityType) {
        const progress = this.activityMap.get(activity);
        progress[0]++;
        if (progress[0] === progress[1]) {
            this.activityMap.delete(activity);
        } else {
            this.activityMap.set(activity, progress);
        }
        this.observable.next(this.activityMap);
    }
}
