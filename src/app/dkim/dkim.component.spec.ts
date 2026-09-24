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

import { DkimComponent } from './dkim.component';

describe('DkimComponent', () => {
    const component = new DkimComponent(null, null, null, null, null, null);

    it('should omit the domain suffix from DNS provider hostnames', () => {
        expect(component.hostnameForDnsProvider('domainyouown.com', 'selector1._domainkey.domainyouown.com'))
            .toBe('selector1._domainkey');
    });

    it('should keep hostnames unchanged when they are already relative', () => {
        expect(component.hostnameForDnsProvider('domainyouown.com', 'selector2._domainkey'))
            .toBe('selector2._domainkey');
    });
});
