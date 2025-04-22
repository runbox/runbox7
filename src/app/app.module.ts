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
import { RunboxCommonModule } from './common/common.module';
import { MailViewerModule } from './mailviewer/mailviewer.module';
import { WebSocketSearchModule } from './websocketsearch/websocketsearch.module';
import { RMMHttpInterceptorService } from './rmmapi/rmmhttpinterceptor.service';
import { ContactsService } from './contacts-app/contacts.service';
import { StorageService } from './storage.service';
import { RouterModule, Routes } from '@angular/router';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
import { MatLegacyProgressBarModule as MatProgressBarModule } from '@angular/material/legacy-progress-bar';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { CanvasTableModule } from './canvastable/canvastable';
import { VirtualScrollTableComponent } from './virtual-scroll-table/virtual-scroll-table.component'
import { MoveMessageDialogComponent } from './actions/movemessage.action';
import { RunboxWebmailAPI } from './rmmapi/rbwebmail';
import { RMMOfflineService } from './rmmapi/rmmoffline.service';
import { ComposeModule } from './compose/compose.module';
import { DraftDeskComponent } from './compose/draftdesk.component';
import { StartDeskModule } from './start/startdesk.module';
import { WelcomeDeskComponent } from './welcome/welcomedesk.component';
import { WelcomeDeskModule } from './welcome/welcomedesk.module';
import { AccountAppModule } from './account-app/account-app.module';
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
import { ServiceWorkerModule, SwRegistrationOptions } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { SearchExpressionBuilderModule } from './xapian/search-expression-builder/search-expression-builder.module';
import { UpdateAlertModule } from './updatealert/updatealert.module';
import { MultipleSearchFieldsInputModule } from './xapian/multiple-search-fields-input/multiple-search-fields-input.module';
import { LoginLogoutModule } from './login/loginlogout.module';
import { HotkeyModule } from 'angular2-hotkeys';
import { RMM } from './rmm';
import { PopularRecipientsComponent } from './popular-recipients/popular-recipients.component';
import { OverviewComponent } from './start/overview.component';
import { StartDeskComponent } from './start/startdesk.component';
import { SearchService } from './xapian/searchservice';
import { SavedSearchesComponent } from './saved-searches/saved-searches.component';
import { SavedSearchesService } from './saved-searches/saved-searches.service';
import { HelpComponent } from './help/help.component';
import { HelpModule } from './help/help.module';
import { DomainRegisterRedirectComponent } from './domainregister/domreg-redirect.component';
import { HumanBytesPipe } from './human-bytes.pipe';
import { FollowsMouseComponent } from './follows-mouse/follows-mouse.component';
import { DatePipe } from '@angular/common';
import { ResizableButtonComponent } from './resizable-button/resizable-button.component';
import { SortButtonComponent } from './sort-button/sort-button.component';
import { ResizeObserverDirective } from './directives/resize-observer.directive';

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
            path: 'overview',
            component: StartDeskComponent
          },
          {
            path: 'welcome',
            component: WelcomeDeskComponent
          }
        ]
      },
      { path: 'start', component: OverviewComponent },
      { path: 'help', component: HelpComponent },
      { path: 'dev',                loadChildren: () => import('./dev/dev.module').then(m => m.DevModule) },
      { path: 'dkim',               loadChildren: () => import('./dkim/dkim.module').then(m => m.DkimModule) },
      { path: 'calendar',           loadChildren: () => import('./calendar-app/calendar-app.module').then(m => m.CalendarAppModule) },
      { path: 'changelog',          loadChildren: () => import('./changelog/changelog.module').then(m => m.ChangelogModule) },
      { path: 'contacts',           loadChildren: () => import('./contacts-app/contacts-app.module').then(m => m.ContactsAppModule) },
      { path: 'onscreen',           loadChildren: () => import('./onscreen/onscreen.module').then(m => m.OnscreenModule) },
      { path: 'identities',         redirectTo: '/account/identities' },
      { path: 'account-security',   redirectTo: '/account/security'   },
      // can't handle it with a simple redirectTo because it'd lose the query params
      // (https://github.com/angular/angular/issues/13315)
      { path: 'domainregistration', component: DomainRegisterRedirectComponent },
    ]
  },
  { path: 'login', component: LoginComponent }
];

@NgModule({
    imports: [
        BrowserModule,
        FormsModule,
        ResizeObserverDirective,
        DatePipe,
        ResizableButtonComponent,
        SortButtonComponent,
        MatBadgeModule,
        HttpClientModule,
        VirtualScrollTableComponent,
        HttpClientJsonpModule,
        CanvasTableModule,
        ComposeModule,
        StartDeskModule,
        WelcomeDeskModule,
        FolderModule,
        HelpModule,
        MatSnackBarModule,
        MatIconModule,
        MatDialogModule,
        MatExpansionModule,
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
        MatSelectModule,
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
        RunboxCommonModule,
        RouterModule.forRoot(routes),
        ServiceWorkerModule.register('/app/ngsw-worker.js', { enabled: environment.production }),
        HotkeyModule.forRoot(),
        HumanBytesPipe,
        FollowsMouseComponent
    ],
    exports: [],
    declarations: [
        MainContainerComponent,
        AppComponent,
        MoveMessageDialogComponent,
        PopularRecipientsComponent,
        SavedSearchesComponent,
    ],
    providers: [ProgressService,
        MessageListService,
        MobileQueryService,
        RunboxWebmailAPI,
        SearchService,
        RMMOfflineService,
        RMM,
        RMMAuthGuardService,
        ContactsService,
        SavedSearchesService,
        StorageService,
        { provide: HTTP_INTERCEPTORS, useClass: RMMHttpInterceptorService, multi: true },
        { provide: ErrorHandler, useClass: SentryErrorHandler },
        { provide: SwRegistrationOptions,
          useFactory: () => ({ registrationStrategy: 'registerWithDelay:5000' }) }
    ],
    bootstrap: [MainContainerComponent]
})
export class AppModule {
  constructor (matIconRegistry: MatIconRegistry, domSanitizer: DomSanitizer) {
    matIconRegistry.addSvgIconSet(
      domSanitizer.bypassSecurityTrustResourceUrl('./assets/mdi.svg')
    );
  }
}

