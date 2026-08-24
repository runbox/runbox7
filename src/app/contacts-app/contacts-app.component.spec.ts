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

import { runContactImportQueue } from './contacts-app.component';

describe('runContactImportQueue', () => {
    it('limits concurrent contact saves', async () => {
        const contacts = Array.from({ length: 10 }, (_, i) => i);
        const started: number[] = [];
        let activeSaves = 0;
        let maxActiveSaves = 0;

        await runContactImportQueue(contacts, 3, async contact => {
            started.push(contact);
            activeSaves += 1;
            maxActiveSaves = Math.max(maxActiveSaves, activeSaves);

            await new Promise<void>(resolve => setTimeout(resolve, 0));

            activeSaves -= 1;
        });

        expect(started).toEqual(contacts);
        expect(maxActiveSaves).toBe(3);
    });

    it('falls back to a single worker for invalid concurrency limits', async () => {
        const contacts = [1, 2, 3];
        let activeSaves = 0;
        let maxActiveSaves = 0;

        await runContactImportQueue(contacts, 0, async () => {
            activeSaves += 1;
            maxActiveSaves = Math.max(maxActiveSaves, activeSaves);

            await new Promise<void>(resolve => setTimeout(resolve, 0));

            activeSaves -= 1;
        });

        expect(maxActiveSaves).toBe(1);
    });
});
