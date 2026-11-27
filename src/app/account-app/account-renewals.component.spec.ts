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

import { canRenewActiveProduct } from './account-renewals.component';

describe('canRenewActiveProduct', () => {
    it('should not allow storage add-on renewals', () => {
        expect(canRenewActiveProduct({
            pid: 301,
            type: 'addon',
            subtype: 'emailaddon',
            name: 'Additional Email Storage Space',
        })).toBe(false);
    });

    it('should allow normal product renewals', () => {
        expect(canRenewActiveProduct({
            pid: 1010,
            type: 'subscription',
            subtype: 'medium',
            name: 'Runbox Medium',
        })).toBe(true);
    });

    it('should leave trial and domain products out of regular renewals', () => {
        expect(canRenewActiveProduct({
            pid: 1000,
            type: 'subscription',
            subtype: 'trial',
            name: 'Trial',
        })).toBe(false);

        expect(canRenewActiveProduct({
            pid: 601,
            type: 'addon',
            subtype: 'domain',
            name: 'Domain registration',
        })).toBe(false);
    });
});
