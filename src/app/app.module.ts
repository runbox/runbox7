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

import { NgModule } from '@angular/core';
import { HttpModule, JsonpModule, BrowserXhr } from '@angular/http';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { MenuModule } from './menu/menu.module';
import { LoginComponent } from './login/login.component';

import { MailViewerModule } from './mailviewer/mailviewer.module';
import { WebSocketSearchModule } from './websocketsearch/websocketsearch.module';
import { RMMHttpInterceptorService } from './rmmapi/rmmhttpinterceptor.service';
import { RouterModule, Routes } from '@angular/router';
import {
  MatCardModule, MatInputModule, MatSnackBarModule, MatButtonModule,
  MatCheckboxModule,
  MatIconModule,
  MatMenuModule,
  MatProgressSpinnerModule,
  MatListModule,
  MatDialogModule,
  MatToolbarModule,
  MatTooltipModule,
  MatButtonToggleModule, MatProgressBarModule, MatSidenavModule
} from '@angular/material';
import { CanvasTableModule } from './canvastable/canvastable';
import { MoveMessageDialogComponent } from './actions/movemessage.action';
import { RunboxWebmailAPI } from './rmmapi/rbwebmail';
import { ComposeModule } from './compose/compose.module';
import { ContactsAppModule } from './contacts-app/contacts-app.module';
import { ContactsAppComponent } from './contacts-app/contacts-app.component';
import { CalendarAppModule } from './calendar-app/calendar-app.module';
import { CalendarAppComponent } from './calendar-app/calendar-app.component';
import { DraftDeskComponent } from './compose/draftdesk.component';
import { AccountAppModule } from './account-app/account-app.module';
import { AccountAppComponent } from './account-app/account-app.component';
import { ProgressBrowserXhr, ProgressService } from './http/progress.service';
import { MessageListService } from './rmmapi/messagelist.service';
import { DialogModule } from './dialog/dialog.module';
import { FolderModule } from './folder/folder.module';
import { RMMAuthGuardService } from './rmmapi/rmmauthguard.service';
import { ResizerModule } from './directives/resizer.module';
import { DkimModule } from './dkim/dkim.module';
import { DkimComponent } from './dkim/dkim.component';
import { DomainRegisterModule } from './domainregister/domainregister.module';
import { DomainRegisterComponent } from './domainregister/domainregister.component';
import { MainContainerComponent } from './maincontainer.component';
import { HeaderToolbarComponent } from './menu/headertoolbar.component';
import { LocalSearchIndexModule } from './xapian/localsearchindex.module';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { SearchExpressionBuilderModule } from './xapian/search-expression-builder/search-expression-builder.module';
import { UpdateAlertModule } from './updatealert/updatealert.module';
import { MultipleSearchFieldsInputModule } from './xapian/multiple-search-fields-input/multiple-search-fields-input.module';
import { LoginLogoutModule } from './login/loginlogout.module';

window.addEventListener('dragover', (event) => event.preventDefault());
window.addEventListener('drop', (event) => event.preventDefault());

const routes: Routes = [
  {
    path: '',
    canActivateChild: [RMMAuthGuardService],
    children: [
      {
        path: '', outlet: 'headertoolbar',
        component: HeaderToolbarComponent
      },
      { path: 'domainregistration', component: DomainRegisterComponent},
      { path: 'dkim', component: DkimComponent},
      { path: 'calendar', component: CalendarAppComponent },
      { path: 'index_dev.html', component: AppComponent },
      { path: 'app', component: AppComponent },
      { path: '',
        component: AppComponent,
        children: [
          {
            path: 'compose',
            component: DraftDeskComponent
          }
        ]
      }
    ]
  },
  { path: 'login', component: LoginComponent }
];

@NgModule({
  imports: [BrowserModule, HttpModule, JsonpModule, FormsModule,
    HttpClientModule,
    CanvasTableModule,
    ComposeModule,
    FolderModule,
    MatSnackBarModule,
    MatIconModule,
    MatDialogModule,
    MatListModule,
    MatMenuModule,
    MatCardModule, MatInputModule,
    MenuModule,
    MatCheckboxModule,
    MatToolbarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatProgressBarModule,
    MatSidenavModule,
    BrowserAnimationsModule,
    LocalSearchIndexModule,
    DialogModule,
    WebSocketSearchModule,
    MailViewerModule,
    AccountAppModule,
    CalendarAppModule,
    ContactsAppModule,
    ResizerModule,
    DomainRegisterModule,
    DkimModule,
    UpdateAlertModule,
    LoginLogoutModule,
    SearchExpressionBuilderModule,
    MultipleSearchFieldsInputModule,
    RouterModule.forRoot(routes),
    ServiceWorkerModule.register('/app/ngsw-worker.js', { enabled: environment.production })
  ],
  declarations: [MainContainerComponent, AppComponent,
    MoveMessageDialogComponent
    ],
  providers: [ProgressService,
    { provide: BrowserXhr, useClass: ProgressBrowserXhr, deps: [ProgressService] },
    MessageListService,
    RunboxWebmailAPI,
    RMMAuthGuardService,
    { provide: HTTP_INTERCEPTORS, useClass: RMMHttpInterceptorService, multi: true}
  ],
  bootstrap: [MainContainerComponent],
  entryComponents: [MoveMessageDialogComponent]
})
export class AppModule { }

