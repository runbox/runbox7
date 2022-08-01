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

import { ApplicationRef, Injectable } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { MatDialog } from '@angular/material/dialog';
import { UpdateAlertComponent } from './updatealert.component';
import { environment } from '../../environments/environment';
import { concat, timer } from 'rxjs';
import { first } from 'rxjs/operators';

@Injectable()
export class UpdateAlertService {
    constructor(
        private appRef: ApplicationRef,
        private swupdate: SwUpdate,
        dialog: MatDialog
    ) {
        if (environment.production) {
            console.log('UpdateAlertService started');
            swupdate.available.subscribe(ev => {
                dialog.open(UpdateAlertComponent, { data: ev });
            });

            const appIsStable = this.appRef.isStable.pipe(first(isStable => isStable === true));
            const everyFiveMins = timer(0, 5 * 60 * 1000);
            const everyFiveMinsOnceAppIsStable = concat(appIsStable, everyFiveMins);
            everyFiveMinsOnceAppIsStable.subscribe(() =>
                this.checkForUpdates()
            );
        }
    }

    checkForUpdates() {
        console.log(' checking for updates');
        this.swupdate.checkForUpdate()
            .then(() => this.checkForUpdates())
            .catch((err) => console.log('Unable to check for updates', err));
    }
}
