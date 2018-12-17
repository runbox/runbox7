import { Injectable, NgZone } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { MatDialog } from '@angular/material';
import { UpdateAlertComponent } from './updatealert.component';

@Injectable()
export class UpdateAlertService {
    constructor(
        private swupdate: SwUpdate,
        private ngZone: NgZone,
        dialog: MatDialog
    ) {
        console.log('UpdateAlertService started');
        swupdate.available.subscribe(() => {
            dialog.open(UpdateAlertComponent);
        });

        this.checkForUpdates();
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
