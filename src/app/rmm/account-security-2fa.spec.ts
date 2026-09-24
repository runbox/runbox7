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

import * as OTPAuth from 'otpauth';
import { AccountSecurity2fa } from './account-security-2fa';

describe('AccountSecurity2fa', () => {
    it('should preserve the @ sign in the QR code label', () => {
        const app = {
            me: {
                data: {
                    username: 'user@runbox.com'
                }
            }
        } as any;
        const tfa = new AccountSecurity2fa(app);
        spyOn(tfa, 'generate_totp_code').and.returnValue('ABCDEFGHIJKLMNOP');
        spyOn(OTPAuth as any, 'TOTP').and.callFake(function(this: any, config: any) {
            expect(config.label).toBe('user@runbox.com');
            return {
                toString: () => (
                    'otpauth://totp/Runbox:user%40runbox.com?issuer=Runbox&secret=ABCDEFGHIJKLMNOP'
                )
            };
        });

        tfa.totp_regenerate({});

        expect(tfa.qr_code_value).toBe(
            'otpauth://totp/Runbox:user@runbox.com?issuer=Runbox&secret=ABCDEFGHIJKLMNOP'
        );
        expect(tfa.qr_code_value).not.toContain('%40');
    });
});
