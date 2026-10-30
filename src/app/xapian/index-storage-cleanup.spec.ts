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

import {
  closeIndexedDatabaseConnections,
  deleteIndexedDatabase
} from './index-storage-cleanup';

interface FakeDeleteRequest {
  error: DOMException | null;
  onblocked: (event: Event) => void;
  onerror: (event: Event) => void;
  onsuccess: (event: Event) => void;
}

describe('index storage cleanup', () => {
  it('closes every Emscripten IndexedDB connection before clearing the registry', () => {
    const closed: string[] = [];
    const databases: Record<string, { close: () => void }> = {
      main: { close: () => closed.push('main') },
      partitions: { close: () => closed.push('partitions') }
    };

    closeIndexedDatabaseConnections(databases);

    expect(closed).toEqual(['main', 'partitions']);
    expect(databases).toEqual({});
  });

  it('rejects instead of waiting forever when IndexedDB deletion is blocked', async () => {
    let request: FakeDeleteRequest;
    const indexedDatabase = {
      deleteDatabase: () => {
        request = {
          error: null,
          onblocked: null,
          onerror: null,
          onsuccess: null
        };
        return request as unknown as IDBOpenDBRequest;
      }
    } as unknown as IDBFactory;
    const deletion = deleteIndexedDatabase(indexedDatabase, '/index');

    request.onblocked(new Event('blocked'));

    await expectAsync(deletion).toBeRejectedWithError(
      'IndexedDB deletion was blocked for /index'
    );
  });

  it('rejects with the database error when IndexedDB deletion fails', async () => {
    let request: FakeDeleteRequest;
    const failure = new DOMException('storage unavailable');
    const indexedDatabase = {
      deleteDatabase: () => {
        request = {
          error: failure,
          onblocked: null,
          onerror: null,
          onsuccess: null
        };
        return request as unknown as IDBOpenDBRequest;
      }
    } as unknown as IDBFactory;
    const deletion = deleteIndexedDatabase(indexedDatabase, '/index');

    request.onerror(new Event('error'));

    await expectAsync(deletion).toBeRejectedWith(failure);
  });
});
