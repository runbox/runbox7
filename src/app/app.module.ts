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
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AppComponent } from './app.component';
import { MenuModule } from './menu/menu.module';
import { LoginComponent } from './login/login.component';

import { RMMHttpInterceptorService } from './rmmapi/rmmhttpinterceptor.service';
import { StorageService } from './storage.service';
import { RouterModule, Routes } from '@angular/router';
import { ComposeModule } from './compose/compose.module';
import { ContactsAppModule } from './contacts-app/contacts-app.module';
import { CalendarAppModule } from './calendar-app/calendar-app.module';
import { CalendarAppComponent } from './calendar-app/calendar-app.component';
import { EmailAppModule } from './email-app/email-app.module';
import { EmailAppComponent } from './email-app/email-app.component';
import { DraftDeskComponent } from './compose/draftdesk.component';
import { AccountAppModule } from './account-app/account-app.module';
import { RMMAuthGuardService } from './rmmapi/rmmauthguard.service';
import { DkimModule } from './dkim/dkim.module';
import { DkimComponent } from './dkim/dkim.component';
import { DomainRegisterModule } from './domainregister/domainregister.module';
import { DomainRegisterComponent } from './domainregister/domainregister.component';
import { HeaderToolbarComponent } from './menu/headertoolbar.component';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { UpdateAlertModule } from './updatealert/updatealert.module';
import { LoginLogoutModule } from './login/loginlogout.module';

const routes: Routes = [
  {
    path: '',
    canActivateChild: [RMMAuthGuardService],
    children: [
      {
        path: '', outlet: 'headertoolbar',
        component: HeaderToolbarComponent
      },
      { path: '',
        component: EmailAppComponent,
        children: [
          {
            path: 'compose',
            component: DraftDeskComponent
          }
        ]
      },
      { path: 'domainregistration', component: DomainRegisterComponent},
      { path: 'dkim', component: DkimComponent},
      { path: 'calendar', component: CalendarAppComponent },
      { path: 'index_dev.html', component: AppComponent },
      { path: 'app', component: AppComponent },
    ]
  },
  { path: 'login', component: LoginComponent }
];

@NgModule({
  imports: [
    HttpClientModule,
    ComposeModule,
    EmailAppModule,
    MenuModule,
    AccountAppModule,
    CalendarAppModule,
    ContactsAppModule,
    DomainRegisterModule,
    DkimModule,
    UpdateAlertModule,
    LoginLogoutModule,
    RouterModule.forRoot(routes),
    ServiceWorkerModule.register('/app/ngsw-worker.js', { enabled: environment.production })
  ],
  declarations: [AppComponent],
  bootstrap: [AppComponent],
  providers: [
    RMMAuthGuardService,
    StorageService,
    { provide: HTTP_INTERCEPTORS, useClass: RMMHttpInterceptorService, multi: true}
  ],
})
export class AppModule { }
