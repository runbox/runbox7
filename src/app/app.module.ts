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

import { NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HttpClientJsonpModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { SentryErrorHandler } from './sentry-error-handler';
import { AppComponent } from './app.component';
import { MenuModule } from './menu/menu.module';
import { LoginComponent } from './login/login.component';

import { MailViewerModule } from './mailviewer/mailviewer.module';
import { WebSocketSearchModule } from './websocketsearch/websocketsearch.module';
import { RMMHttpInterceptorService } from './rmmapi/rmmhttpinterceptor.service';
import { ContactsService } from './contacts-app/contacts.service';
import { StorageService } from './storage.service';
import { RouterModule, Routes } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CanvasTableModule } from './canvastable/canvastable';
import { MoveMessageDialogComponent } from './actions/movemessage.action';
import { RunboxWebmailAPI } from './rmmapi/rbwebmail';
import { RMMOfflineService } from './rmmapi/rmmoffline.service';
import { ComposeModule } from './compose/compose.module';
import { DraftDeskComponent } from './compose/draftdesk.component';
import { WelcomeDeskComponent } from './welcome/welcomedesk.component';
import { WelcomeDeskModule } from './welcome/welcomedesk.module';
import { AccountAppModule } from './account-app/account-app.module';
import { AccountAppComponent } from './account-app/account-app.component';
import { ProgressService } from './http/progress.service';
import { MessageListService } from './rmmapi/messagelist.service';
import { MobileQueryService } from './mobile-query.service';
import { DialogModule } from './dialog/dialog.module';
import { FolderModule } from './folder/folder.module';
import { RMMAuthGuardService } from './rmmapi/rmmauthguard.service';
import { ResizerModule } from './directives/resizer.module';
import { MainContainerComponent } from './maincontainer.component';
import { HeaderToolbarComponent } from './menu/headertoolbar.component';
import { LocalSearchIndexModule } from './xapian/localsearchindex.module';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { SearchExpressionBuilderModule } from './xapian/search-expression-builder/search-expression-builder.module';
import { UpdateAlertModule } from './updatealert/updatealert.module';
import { MultipleSearchFieldsInputModule } from './xapian/multiple-search-fields-input/multiple-search-fields-input.module';
import { LoginLogoutModule } from './login/loginlogout.module';
import { HotkeyModule } from 'angular2-hotkeys';
import { RMM } from './rmm';

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
      { path: 'index_dev.html', component: AppComponent },
      { path: 'app', component: AppComponent },
      { path: '',
        component: AppComponent,
        children: [
          {
            path: 'compose',
            component: DraftDeskComponent
          },
          {
            path: 'welcome',
            component: WelcomeDeskComponent
          }
        ]
      },
      { path: 'dev',                loadChildren: './dev/dev.module#DevModule' },
      { path: 'dkim',               loadChildren: './dkim/dkim.module#DkimModule' },
      { path: 'domainregistration', loadChildren: './domainregister/domainregister.module#DomainRegisterModule' },
      { path: 'calendar',           loadChildren: './calendar-app/calendar-app.module#CalendarAppModule' },
      { path: 'changelog',          loadChildren: './changelog/changelog.module#ChangelogModule' },
      { path: 'contacts',           loadChildren: './contacts-app/contacts-app.module#ContactsAppModule' },
      { path: 'identities',         loadChildren: './profiles/profiles.module#ProfilesModule' },
    ]
  },
  { path: 'login', component: LoginComponent }
];

@NgModule({
  imports: [BrowserModule, FormsModule,
    HttpClientModule,
    HttpClientJsonpModule,
    CanvasTableModule,
    ComposeModule,
    WelcomeDeskModule,
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
    ResizerModule,
    UpdateAlertModule,
    LoginLogoutModule,
    SearchExpressionBuilderModule,
    MultipleSearchFieldsInputModule,
    RouterModule.forRoot(routes),
    ServiceWorkerModule.register('/app/ngsw-worker.js', { enabled: environment.production }),
    HotkeyModule.forRoot()
  ],
  declarations: [MainContainerComponent, AppComponent,
    MoveMessageDialogComponent
    ],
  providers: [ProgressService,
    MessageListService,
    MobileQueryService,
    RunboxWebmailAPI,
    RMMOfflineService,
    RMM,
    RMMAuthGuardService,
    ContactsService,
    StorageService,
    { provide: HTTP_INTERCEPTORS, useClass: RMMHttpInterceptorService, multi: true},
    { provide: ErrorHandler, useClass: SentryErrorHandler },
  ],
  bootstrap: [MainContainerComponent],
  entryComponents: [MoveMessageDialogComponent]
})
export class AppModule { }

