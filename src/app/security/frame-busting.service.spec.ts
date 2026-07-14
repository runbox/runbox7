// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2024 Runbox Solutions AS (runbox.com).
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

import { FrameBustingService } from './frame-busting.service';

describe('FrameBustingService', () => {
    let service: FrameBustingService;

    beforeEach(() => { service = new FrameBustingService(); });

    it('reports not framed when top === self', () => {
        const w: any = {}; w.self = w; w.top = w;
        expect(service.isFramed(w)).toBeFalse();
    });

    it('reports framed when top !== self', () => {
        const w: any = { top: {} }; w.self = w;
        expect(service.isFramed(w)).toBeTrue();
    });

    it('reports framed when accessing top throws (cross-origin)', () => {
        const w: any = {}; w.self = w;
        Object.defineProperty(w, 'top', { get() { throw new Error('cross-origin'); } });
        expect(service.isFramed(w)).toBeTrue();
    });
});
