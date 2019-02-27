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

import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MenuModule } from '../menu/menu.module';
import { RouterModule, Routes, RouteReuseStrategy } from '@angular/router';

import { HeaderToolbarComponent } from '../menu/headertoolbar.component';

import {
  MatButtonModule,
  MatIconModule,
  MatListModule,
  MatSelectModule,
  MatSidenavModule,
  MatToolbarModule,
  MatTooltipModule
} from '@angular/material';

import { ContactsAppComponent } from './contacts-app.component';
import { ContactDetailsComponent } from './contact-details/contact-details.component';
import { ContactsService } from './contacts.service';
import { RMMRouteReuseStrategy } from './routereusestrategy';

@NgModule({
  declarations: [
    ContactsAppComponent,
    ContactDetailsComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSelectModule,
    MatSidenavModule,
    MatToolbarModule,
    MatTooltipModule,
    MenuModule,
    ReactiveFormsModule,
    RouterModule.forChild([
      {
        path: '', outlet: 'headertoolbar',
        component: HeaderToolbarComponent
      },
      { path: 'contacts', component: ContactsAppComponent,
        children: [
         {
            path: ':id',
            component: ContactDetailsComponent,
            runGuardsAndResolvers: 'always'
          }
        ]
      },
    ])
  ],
  providers: [
    ContactsService,
    {
      provide: RouteReuseStrategy,
      useClass: RMMRouteReuseStrategy
    }
  ],
  bootstrap: [ContactsAppComponent]
})
export class ContactsAppModule { }
