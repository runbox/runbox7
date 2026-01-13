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

import { firstValueFrom, forkJoin } from 'rxjs';
import { NoOpIndexService } from './noop-index.service';

describe('NoOpIndexService', () => {
    let service: NoOpIndexService;

    beforeEach(() => {
        service = new NoOpIndexService();
    });

    it('reports inactive and completes index event streams without emissions', () => {
        expect(service.isActive).toBeFalse();

        let reloadedEmitted = false;
        let reloadedCompleted = false;
        service.indexReloaded$.subscribe({
            next: () => {
                reloadedEmitted = true;
            },
            complete: () => {
                reloadedCompleted = true;
            }
        });

        expect(reloadedEmitted).toBeFalse();
        expect(reloadedCompleted).toBeTrue();

        let updatedEmitted = false;
        let updatedCompleted = false;
        service.indexUpdated$.subscribe({
            next: () => {
                updatedEmitted = true;
            },
            complete: () => {
                updatedCompleted = true;
            }
        });

        expect(updatedEmitted).toBeFalse();
        expect(updatedCompleted).toBeTrue();
    });

    it('returns empty results for queries and lookups', async () => {
        const searchResults = await firstValueFrom(service.search('query'));
        expect(searchResults).toEqual([]);

        expect(service.getMessageData(123)).toBeNull();

        const text = await service.getMessageText('123');
        expect(text).toBe('');

        const ids = service.getMessagesInTimeRange(new Date('2024-01-01'), new Date('2024-01-02'));
        expect(ids).toEqual([]);
    });

    it('returns defaults for init, persistence, and downloads', async () => {
        const results = await firstValueFrom(forkJoin({
            init: service.init(),
            persist: service.persistIndex(),
            download: service.downloadFromServer()
        }));

        expect(results.init).toBeFalse();
        expect(results.persist).toBeFalse();
        expect(results.download).toBeFalse();
    });

    it('no-ops for mutation methods', async () => {
        const results = await firstValueFrom(forkJoin({
            add: service.addMessages([]),
            update: service.updateFlags('1', { seen: true }),
            move: service.moveMessages(['1'], 'Inbox'),
            del: service.deleteMessages(['1']),
            deleteIndex: service.deleteIndex()
        }));

        expect(results.add).toBeUndefined();
        expect(results.update).toBeUndefined();
        expect(results.move).toBeUndefined();
        expect(results.del).toBeUndefined();
        expect(results.deleteIndex).toBeUndefined();
    });

    it('does not throw when setting current folder', () => {
        expect(() => service.setCurrentFolder('Inbox')).not.toThrow();
    });
});
