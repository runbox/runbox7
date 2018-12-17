import { MatDialogModule, MatButtonModule } from '@angular/material';
import { NgModule } from '@angular/core';
import { UpdateAlertComponent } from './updatealert.component';
import { UpdateAlertService } from './updatealert.service';

@NgModule({
    imports: [
        MatDialogModule,
        MatButtonModule
    ],
    declarations: [
        UpdateAlertComponent
    ],
    providers: [
        UpdateAlertService
    ],
    entryComponents: [
        UpdateAlertComponent
    ]
})
export class UpdateAlertModule {
    constructor(alertservice: UpdateAlertService) {

    }
}
