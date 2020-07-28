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

import { Subject, Observable } from 'rxjs';

// not @Injectable on purpose: each app/service is expected to have its own,
// implemented with its own relevant type
export class BackgroundActivityService<ActivityType> {
    activitySet     = new Set<ActivityType>();
    activitySubject = new Subject<ActivityType[]>();

    get observable(): Observable<ActivityType[]> {
        return this.activitySubject;
    }

    private notify() {
        this.activitySubject.next(Array.from(this.activitySet.values()));
    }

    public begin(activity: ActivityType) {
        this.activitySet.add(activity);
        this.notify();
    }

    public end(activity: ActivityType) {
        this.activitySet.delete(activity);
        this.notify();
    }
}
