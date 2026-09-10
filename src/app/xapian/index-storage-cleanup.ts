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

interface IndexedDatabaseConnection {
  close: () => void;
}

export function closeIndexedDatabaseConnections(
  databases: Record<string, IndexedDatabaseConnection>
): void {
  Object.keys(databases).forEach(name => {
    databases[name].close();
    delete databases[name];
  });
}

export function deleteIndexedDatabase(
  indexedDatabase: IDBFactory,
  name: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDatabase.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(
      request.error || new Error(`Unable to delete IndexedDB database ${name}`)
    );
    request.onblocked = () => reject(
      new Error(`IndexedDB deletion was blocked for ${name}`)
    );
  });
}
