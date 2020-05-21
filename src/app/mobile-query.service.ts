// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2019 Runbox Solutions AS (runbox.com).
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

import { Injectable } from '@angular/core';
import { MediaMatcher } from '@angular/cdk/layout';
import { Subject } from 'rxjs';

// just an injectable wrapper around a preconfigured MediaMatcher

@Injectable()
export class MobileQueryService {
    public mobileQuery: MediaQueryList;
    public changed = new Subject<boolean>();

    get matches(): boolean {
        return this.mobileQuery.matches;
    }

    constructor(
        private media: MediaMatcher,
    ) {
        this.mobileQuery = media.matchMedia('(max-width: 1024px)');
        // tslint:disable-next-line:deprecation
        this.mobileQuery.addListener(() => this.changed.next(this.mobileQuery.matches));
    }

    addListener(listener: () => void) {
        // the non-deprecated addEventListener doesn't work on Safari, so...
        // tslint:disable-next-line:deprecation
        this.mobileQuery.addListener(listener);
    }

    removeListener(listener: () => void) {
        // the non-deprecated removeEventListener doesn't work on Safari, so...
        // tslint:disable-next-line:deprecation
        this.mobileQuery.removeListener(listener);
    }
}
