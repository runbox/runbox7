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

import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
    let component: LoginComponent;

    beforeEach(() => {
        component = new LoginComponent({} as any, {} as any, {} as any, {} as any, {} as any);
    });

    function handleLoginError(response: any) {
        (component as any).handleLoginError(response);
    }

    function resetLoginErrors() {
        (component as any).login_errors_reset();
    }

    it('shows authentication errors before expired subscription renewal prompts', () => {
        handleLoginError({
            code: 401,
            error: 'Incorrect username or password',
            user_status: '4',
        });

        expect(component.login_error_html).toContain('Incorrect username or password');
        expect(component.accountExpiredSubscription).toBeFalse();
    });

    it('still shows expired subscription prompts when no authentication error is present', () => {
        handleLoginError({
            user_status: '4',
        });

        expect(component.accountExpiredSubscription).toBeTrue();
        expect(component.login_error_html).toBeUndefined();
    });

    it('clears account-status prompts before the next login attempt', () => {
        handleLoginError({
            user_status: '4',
        });

        resetLoginErrors();

        expect(component.accountExpiredSubscription).toBeFalse();
    });
});
