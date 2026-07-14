// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2022 Runbox Solutions AS (runbox.com).
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

import { updateMessageSignature } from './compose.component';

describe('ComposeComponent.updateMessageSignature', () => {
    it('removes the current signature when switching to an identity without one', () => {
        const signature = 'Best regards\nAlice';
        const bodyContent = 'Hello world';
        const msgBody = signature + '\n\n' + bodyContent;

        const result = updateMessageSignature(msgBody, signature, null);

        expect(result).toBe('\n\n' + bodyContent);
    });

    it('handles signatures with regex-special characters', () => {
        const signature = 'A.B (C) [D] x+y';
        const msgBody = signature + '\n\nEmail body';

        const result = updateMessageSignature(msgBody, signature, null);

        expect(result).toBe('\n\nEmail body');
    });

    it('leaves the message unchanged when the current signature is not at the start', () => {
        const signature = 'My Sig';
        const msgBody = 'Some text without the sig';

        const result = updateMessageSignature(msgBody, signature, null);

        expect(result).toBe(msgBody);
    });
});
