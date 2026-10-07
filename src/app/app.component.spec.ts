// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2026 Runbox Solutions AS (runbox.com).
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

import { LOCAL_INDEX_STOP_TOOLTIP } from './app.component';

describe('AppComponent local index copy', () => {
    it('explains what stopping index synchronization removes and why', () => {
        expect(LOCAL_INDEX_STOP_TOOLTIP).toContain('locally stored search index');
        expect(LOCAL_INDEX_STOP_TOOLTIP).toContain('makes message search faster');
        expect(LOCAL_INDEX_STOP_TOOLTIP).toContain('shared or untrusted devices');
    });
});
