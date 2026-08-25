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
  CancelInitialSyncCommand,
  CatchUpRecentCommand,
  OpenIndexCommand,
  StartPeriodicSyncCommand
} from './index-sync.types';

export interface InitialSyncWorkerCommandHandlers {
  openIndex: (command: OpenIndexCommand) => void;
  catchUpRecent: (command: CatchUpRecentCommand) => void;
  cancelInitialSync: (command: CancelInitialSyncCommand) => void;
  startPeriodicSync: (command: StartPeriodicSyncCommand) => void;
}

export const handleInitialSyncWorkerCommand = (
  data: unknown,
  handlers: InitialSyncWorkerCommandHandlers
): boolean => {
  if (!data || typeof data !== 'object' || !('action' in data)) {
    return false;
  }

  switch ((data as { action: string }).action) {
    case 'openIndex':
      handlers.openIndex(data as OpenIndexCommand);
      return true;
    case 'catchUpRecent':
      handlers.catchUpRecent(data as CatchUpRecentCommand);
      return true;
    case 'cancelInitialSync':
      handlers.cancelInitialSync(data as CancelInitialSyncCommand);
      return true;
    case 'startPeriodicSync':
      handlers.startPeriodicSync(data as StartPeriodicSyncCommand);
      return true;
    default:
      return false;
  }
};
