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

import { NgZone } from '@angular/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { UPDATE_READY_DEBOUNCE_MS, UpdateAlertService } from './updatealert.service';

class MockNgZone {
    runOutsideAngular(fn: () => void) {
        return fn();
    }

    run(fn: () => void) {
        return fn();
    }
}

class MockSwUpdate {
    isEnabled = true;
    versionUpdates = new Subject<VersionReadyEvent>();
    checkForUpdate = jasmine.createSpy('checkForUpdate').and.resolveTo(false);
}

function versionReadyEvent(currentHash: string, latestHash: string, latestEpoch: string): VersionReadyEvent {
    return {
        type: 'VERSION_READY',
        currentVersion: {
            hash: currentHash,
            appData: {
                build_epoch: '100',
            },
        },
        latestVersion: {
            hash: latestHash,
            appData: {
                build_epoch: latestEpoch,
            },
        },
    } as VersionReadyEvent;
}

describe('UpdateAlertService', () => {
    const originalProduction = environment.production;

    afterEach(() => {
        environment.production = originalProduction;
    });

    it('shows only the latest ready update when multiple versions are detected together', fakeAsync(() => {
        environment.production = true;
        const swupdate = new MockSwUpdate();
        const service = new UpdateAlertService(
            new MockNgZone() as unknown as NgZone,
            swupdate as unknown as SwUpdate,
            {} as MatDialog,
        );

        swupdate.versionUpdates.next(versionReadyEvent('current', 'intermediate', '200'));
        tick(UPDATE_READY_DEBOUNCE_MS - 1);

        expect(service.updateIsReady.value).toBe(false);

        swupdate.versionUpdates.next(versionReadyEvent('current', 'latest', '300'));
        tick(UPDATE_READY_DEBOUNCE_MS);

        expect(service.updateIsReady.value).toBe(true);
        expect(service.updateStatus.available.hash).toBe('latest');
        const appData = service.updateStatus.available.appData as { build_epoch: string };
        expect(appData.build_epoch).toBe('300');
        discardPeriodicTasks();
    }));
});
