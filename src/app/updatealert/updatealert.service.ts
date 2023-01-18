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

import { Injectable, NgZone } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { MatDialog } from '@angular/material/dialog';
import { UpdateAlertComponent } from './updatealert.component';
import { environment } from '../../environments/environment';
import {filter, map} from 'rxjs/operators';

@Injectable()
export class UpdateAlertService {
    constructor(
        private swupdate: SwUpdate,
        private ngZone: NgZone,
        dialog: MatDialog
    ) {
        if (environment.production) {
            console.log('UpdateAlertService started');
            
            const updatesAvailable = swupdate.versionUpdates.pipe(
                filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
                map(evt => ({
                    type: 'UPDATE_AVAILABLE',
                    current: evt.currentVersion,
                    available: evt.latestVersion,
                })));
            updatesAvailable.subscribe(ev => {
                dialog.open(UpdateAlertComponent, { data: ev });
            });

            this.checkForUpdates();
        }
    }

    checkForUpdates() {
        // Check for updates every minute
        this.ngZone.runOutsideAngular(() =>
            setTimeout(() => this.ngZone.run(() => {
                console.log(' checking for updates');
                this.swupdate.checkForUpdate()
                    .then(() => this.checkForUpdates())
                    .catch((err) => console.log('Unable to check for updates', err));
            }), 60 * 1000)
        );
    }
}
