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

import { AccountSecurity2fa } from './account-security-2fa';

describe('AccountSecurity2fa', () => {
    let tfa: AccountSecurity2fa;

    beforeEach(() => {
        tfa = new AccountSecurity2fa({
            me: {
                data: {
                    username: 'default-user',
                },
            },
        } as any);
    });

    it('should build TOTP QR data from the editable label', () => {
        tfa.new_totp_code = 'JBSWY3DPEHPK3PXP';
        tfa.totp_label = 'Custom Label';

        tfa.update_totp_qr_code();

        expect(tfa.qr_code_value.protocol).toBe('otpauth:');
        expect(tfa.qr_code_value.href).toContain('Runbox:Custom%20Label');
        expect(tfa.qr_code_value.searchParams.get('issuer')).toBe('Runbox');
        expect(tfa.qr_code_value.searchParams.get('secret')).toBe('JBSWY3DPEHPK3PXP');
    });

    it('should fall back to the username when the editable label is empty', () => {
        tfa.new_totp_code = 'JBSWY3DPEHPK3PXP';
        tfa.totp_label = '';

        tfa.update_totp_qr_code();

        expect(tfa.qr_code_value.href).toContain('Runbox:default-user');
    });
});
