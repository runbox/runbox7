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

import { fakeAsync, tick } from '@angular/core/testing';
import { AccountPasswordComponent } from './account-password.component';

describe('AccountPasswordComponent', () => {
    let component: AccountPasswordComponent;

    beforeEach(() => {
        component = new AccountPasswordComponent(
            { open: jasmine.createSpy('open') } as any,
            {
                me: { load: jasmine.createSpy('load') },
                ua: { http: { put: jasmine.createSpy('put') } },
            } as any
        );
        component.time_out_duration = 0;
    });

    it('accepts special characters outside the old hard-coded symbol list', fakeAsync(() => {
        component.check_password('currentPassword1!', 'new_Password1', 'new_Password1');

        tick();

        expect(component.error).toBeUndefined();
    }));

    it('still requires a non-alphanumeric character', fakeAsync(() => {
        component.check_password('currentPassword1!', 'newPassword1', 'newPassword1');

        tick();

        expect(component.error).toBe('Your new password must contain at least 1 special character');
    }));
});
