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

import { NgModule, ApplicationRef, ComponentFactoryResolver, Injector, NgZone } from '@angular/core';
import { RMM6AngularGateway } from './rmm6angulargateway';
import { MailViewerModule, SingleMailViewerComponent } from '../mailviewer/mailviewer.module';
import { DomainRegisterModule } from '../domainregister/domainregister.module';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserXhr } from '@angular/http';
import { HttpClient, HttpClientModule, HttpClientJsonpModule } from '@angular/common/http';
import { ProgressBrowserXhr, ProgressService } from '../http/progress.service';
import { DialogModule } from '../dialog/dialog.module';
import { RMM6MessageActions } from '../mailviewer/rmm6messageactions';
import { RMM6SearchComponent } from './rmm6search.component';
import {
    MatSnackBarModule, MatSnackBar,
    MatInputModule,
    MatIconModule, MatButtonModule
} from '@angular/material';
import { MatTableModule, MatPaginatorModule, MatCheckboxModule, MatDialogModule,
    MatProgressBarModule, MatProgressSpinnerModule, MatTabsModule, MatSelectModule,
    MatListModule, MatCardModule, MatChipsModule } from '@angular/material';
import { FormsModule } from '@angular/forms';
import { SearchExpressionBuilderComponent } from '../xapian/search-expression-builder/search-expression-builder.component';
import { SearchExpressionBuilderModule } from '../xapian/search-expression-builder/search-expression-builder.module';

@NgModule({
    imports: [
        BrowserModule,
        MailViewerModule,
        BrowserAnimationsModule,
        DialogModule,
        MatSnackBarModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        DomainRegisterModule,
        FormsModule,
        HttpClientModule,
        MatTableModule,
        MatDialogModule,
        MatCheckboxModule,
        MatTabsModule,
        MatPaginatorModule,
        MatProgressBarModule,
        MatProgressSpinnerModule,
        MatCardModule,
        MatListModule,
        MatChipsModule,
        MatSelectModule,
        SearchExpressionBuilderModule
    ],
    declarations: [
        RMM6SearchComponent,
    ],
    entryComponents: [
        SearchExpressionBuilderComponent,
        SingleMailViewerComponent,
        RMM6SearchComponent
    ],
    providers: [ProgressService,
        { provide: BrowserXhr, useClass: ProgressBrowserXhr, deps: [ProgressService] },
    ],
})
export class RMM6Module {

    rmmAngularGW: RMM6AngularGateway;

    messageActionsHandler: RMM6MessageActions = new RMM6MessageActions();

    constructor(public appref: ApplicationRef,
        public injector: Injector,
        public componentFactoryResolver: ComponentFactoryResolver,
        public ngZone: NgZone,
        public snackBar: MatSnackBar,
        public http: HttpClient
    ) {
        this.messageActionsHandler.snackBar = snackBar;
        this.messageActionsHandler.http = http;
    }

    public ngDoBootstrap() {
        this.rmmAngularGW = new RMM6AngularGateway(this);
        window['rmmangular'] = this.rmmAngularGW;

        console.log('bootstrapping');
        if (document.getElementsByTagName('app-search-expression-builder').length > 0) {
            const searchExpressionBuilderComponentInstance =
                this.appref.bootstrap(SearchExpressionBuilderComponent).instance;
            searchExpressionBuilderComponentInstance.searchInputField = document.getElementById('websocketsearchfield') as HTMLInputElement;
        }
    }
}
