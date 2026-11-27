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

import moment from 'moment';
import { MOMENT_FORMATS } from './calendar-app.module';

describe('CalendarAppModule', () => {
    it('uses 24-hour time for calendar date-time picker inputs', () => {
        const date = moment({
            year: 2026,
            month: 0,
            date: 1,
            hour: 14,
            minute: 5,
        });

        expect(date.format(MOMENT_FORMATS.fullPickerInput)).toContain('14:05');
        expect(date.format(MOMENT_FORMATS.timePickerInput)).toBe('14:05');
        expect(MOMENT_FORMATS.parseInput).toContain('HH:mm');
        expect(date.format(MOMENT_FORMATS.fullPickerInput)).not.toContain('PM');
    });
});
