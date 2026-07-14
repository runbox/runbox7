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
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface UpdateAppData {
    commit?: string;
    build_time?: string;
    build_epoch?: string;
}

interface UpdateVersion {
    hash: string;
    appData?: UpdateAppData;
}

function toUpdateVersion(version: VersionReadyEvent['currentVersion']): UpdateVersion {
    return {
        hash: version.hash,
        appData: version.appData as UpdateAppData | undefined,
    };
}

export interface UpdateStatus {
    type: string;
    current: UpdateVersion;
    available: UpdateVersion;
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
        private ngZone: NgZone,
        private swupdate: SwUpdate
    ) {
        if (environment.production && swupdate.isEnabled) {
            console.log('UpdateAlertService started');
            
            const updatesAvailable = swupdate.versionUpdates.pipe(
                filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
                map(evt => {
                    const update: UpdateStatus = {
                        type: 'UPDATE_AVAILABLE',
                        current: toUpdateVersion(evt.currentVersion),
                        available: toUpdateVersion(evt.latestVersion),
                    };
                    return update;
                })
            );
            updatesAvailable.subscribe(ev => {
              this.updateStatus = ev;
              this.updateIsReady.next(true);
            });

            this.ngZone.runOutsideAngular(() => {
                this.checkForUpdates();
                setInterval(() => this.ngZone.run(() =>
                    this.checkForUpdates()
                ), 5 * 60 * 1000);
            });
        }
    }

    checkForUpdates() {
        console.log(' checking for updates');
        this.swupdate.checkForUpdate()
            .catch((err) => console.log('Unable to check for updates', err));
    }
}
