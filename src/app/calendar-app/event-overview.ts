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

import * as moment from 'moment';

export class EventOverview {
    ongoing: boolean;

    constructor(
        public title:               string,
        public dtstart:             moment.Moment,
        public dtend?:              moment.Moment,
        public recurringFrequency?: string,
        public location?:           string,
        public description?:        string,

    ) {
        if (dtstart.isBefore(moment()) && dtend && dtend.isAfter(moment())) {
            this.ongoing = true;
        }
        // titlecase
        const freq = this.recurringFrequency;
        if (freq) {
            this.recurringFrequency = freq.charAt(0).toUpperCase()
                                    + freq.slice(1).toLowerCase();
        }
    }
}
