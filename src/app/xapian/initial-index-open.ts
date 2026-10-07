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

export interface InitialIndexOpenDependencies {
  alreadyInitialized: boolean;
  initialize: () => Promise<void>;
  reload: () => Promise<void>;
}

export function prepareInitialIndexOpen(
  dependencies: InitialIndexOpenDependencies
): Promise<void> {
  return dependencies.alreadyInitialized
    ? dependencies.reload()
    : dependencies.initialize();
}

export interface RunInitialIndexOpenDependencies {
  lookupStoredIndex: () => Promise<boolean>;
  initialize: () => Promise<number>;
  ready: (baseline: number) => void;
  failed: (error: Error) => void;
}

export async function runInitialIndexOpen(
  dependencies: RunInitialIndexOpenDependencies
): Promise<void> {
  let settled = false;
  try {
    if (!await dependencies.lookupStoredIndex()) {
      throw new Error('Local search index not found');
    }
    const baseline = await dependencies.initialize();
    settled = true;
    dependencies.ready(baseline);
  } catch (error) {
    if (!settled) {
      settled = true;
      dependencies.failed(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
