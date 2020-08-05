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

import { BackgroundActivityIndicatorComponent } from './background-activity-indicator.component';
import { BackgroundActivityService} from './background-activity.service';

enum TestActivity {
    Activity1 = 'processing',
    Activity2 = 'fizzbuzzing',
}

describe('BackgroundActivityIndicatorComponent', () => {
    let comp: BackgroundActivityIndicatorComponent;
    let service: BackgroundActivityService<TestActivity>;

    beforeEach(async () => {
        comp = new BackgroundActivityIndicatorComponent();
        service = new BackgroundActivityService<TestActivity>();
        comp.activities = service.observable;
        comp.ngOnChanges();
    });

    it('should display an ongoing task until it is complete', async () => {
        expect(comp.shownActivities.length).toBe(0);
        service.begin(TestActivity.Activity1);
        await new Promise(r => setTimeout(r, 0));
        expect(comp.shownActivities.length).toBe(1);
        service.end(TestActivity.Activity1);
        await new Promise(r => setTimeout(r, 0));
        expect(comp.shownActivities.length).toBe(0);
    });

    it('starting an ongoing task should bump its counter', async () => {
        expect(comp.shownActivities.length).toBe(0);

        service.begin(TestActivity.Activity1);
        service.begin(TestActivity.Activity1);
        await new Promise(r => setTimeout(r, 0));
        expect(comp.shownActivities.length).toBe(1);
        expect(comp.shownActivities[0]).toMatch(/processing.*1\/2/);

        service.end(TestActivity.Activity1);
        await new Promise(r => setTimeout(r, 0));
        expect(comp.shownActivities[0]).toMatch(/processing.*2\/2/);

        service.end(TestActivity.Activity1);
        await new Promise(r => setTimeout(r, 0));
        expect(comp.shownActivities.length).toBe(0);
    });

    it('activities are displayed in order of appearance', async () => {
        expect(comp.shownActivities.length).toBe(0);

        service.begin(TestActivity.Activity1);
        service.begin(TestActivity.Activity2, 3);
        await new Promise(r => setTimeout(r, 0));

        expect(comp.shownActivities.length).toBe(2);
        expect(comp.shownActivities[0]).toMatch(/^\D*$/);
        expect(comp.shownActivities[1]).toMatch(/fizzbuzzing.*1\/3/);

        service.end(TestActivity.Activity2);
        await new Promise(r => setTimeout(r, 0));
        expect(comp.shownActivities[1]).toMatch(/fizzbuzzing.*2\/3/);

        service.end(TestActivity.Activity1);
        await new Promise(r => setTimeout(r, 0));
        expect(comp.shownActivities.length).toBe(1);
        expect(comp.shownActivities[0]).toMatch(/fizzbuzzing.*2\/3/);

        service.end(TestActivity.Activity2);
        service.end(TestActivity.Activity2);
        await new Promise(r => setTimeout(r, 0));
        expect(comp.shownActivities.length).toBe(0);
    });
});
