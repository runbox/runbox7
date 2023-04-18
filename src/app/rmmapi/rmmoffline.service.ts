// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2020 Runbox Solutions AS (runbox.com).
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

import { Injectable } from '@angular/core';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';

@Injectable()
export class RMMOfflineService {
    offline = false;
    first_time_offline = true;

    get is_offline(): boolean {
        return this.offline;
    }

    set is_offline(offline: boolean) {
        this.offline = offline;
        if (offline && this.first_time_offline) {
            this.first_time_offline = false;
            this.snackbar.open(
                'Runbox 7 is in offline mode due to a network or server issue. ' +
                'It will automatically reconnect when the network is available again.',
                'Okay',
                { duration: 10_000 },
            );
        }
    }

    constructor(private snackbar: MatSnackBar) { }
}
