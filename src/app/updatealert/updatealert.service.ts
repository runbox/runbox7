import { Injectable } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { MatDialog } from '@angular/material';
import { UpdateAlertComponent } from './updatealert.component';

@Injectable()
export class UpdateAlertService {
    constructor(
        swupdate: SwUpdate,
        dialog: MatDialog
    ) {
        console.log('UpdateAlertService started');
        swupdate.available.subscribe(() => {
            dialog.open(UpdateAlertComponent);
        });

        // Check for updates every minute
        const checkForUpdatesInterval = setInterval(() => {
            console.log(' checking for updates');
            swupdate.checkForUpdate().catch(() => 'Unable to check for updates');
        }, 60 * 1000);
    }
}
