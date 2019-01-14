import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material';

@Component({
    templateUrl: 'updatealert.component.html'
})
export class UpdateAlertComponent {
    constructor(
        private dialogRef: MatDialogRef<UpdateAlertComponent>
    ) {

    }


    close() {
        this.dialogRef.close();
    }

    reload() {
        location.reload();
    }
}
