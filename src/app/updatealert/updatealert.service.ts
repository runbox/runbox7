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
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { environment } from '../../environments/environment';
import { concat, interval, BehaviorSubject } from 'rxjs';
import { filter, map, first } from 'rxjs/operators';

interface UpdateStatus {
    type: string;
    current: {
        hash: string;
        appData?: object;
    };
    available: {
        hash: string;
        appData?: object;
    };
}

@Injectable()
export class UpdateAlertService {
    public updateIsReady: BehaviorSubject<boolean> = new BehaviorSubject(false);
    public updateStatus: UpdateStatus = {
        'type':'UPDATE_AVAILABLE',
        'current':
        {'hash':'blah', 'appData':{'build_epoch':'XX'}},
        'available':
        {'hash':'blah', 'appData':{'commit':'test', 'build_time': 'time', 'build_epoch':'XX'}},
    };
    constructor(
        private appRef: ApplicationRef,
        private swupdate: SwUpdate,
        dialog: MatDialog
    ) {
        if (environment.production && swupdate.isEnabled) {
            console.log('UpdateAlertService started');
            
            const updatesAvailable = swupdate.versionUpdates.pipe(
                filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
                map(evt => {
                    const update: UpdateStatus = {
                        type: 'UPDATE_AVAILABLE',
                        current: evt.currentVersion,
                        available: evt.latestVersion,
                    };
                    return update;
                })
            );
            updatesAvailable.subscribe(ev => {
              this.updateStatus = ev;
              this.updateIsReady.next(true);
            });

            const appIsStable = this.appRef.isStable.pipe(first(isStable => isStable === true));
            const everyFiveMins = interval(5 * 60 * 1000);
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
