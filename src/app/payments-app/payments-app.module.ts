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

import { CommonModule } from '@angular/common';

import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { MenuModule } from '../menu/menu.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { RMMAuthGuardService } from '../rmmapi/rmmauthguard.service';
import { HeaderToolbarComponent } from '../menu/headertoolbar.component';

import { PaymentsService } from './payments.service';
import { AccountComponentsComponent } from './account-components.component';
import { AccountRenewalsComponent } from './account-renewals.component';
import { AccountReceiptComponent } from './account-receipt.component';
import { AccountTransactionsComponent } from './account-transactions.component';
import { AccountUpgradeComponent } from './payments-account-upgrade.component';
import { ComponentCardComponent } from './component-card.component';
import { PaymentsAppComponent } from './payments-app.component';
import { PaymentDialogComponent } from './payment-dialog.component';
import { PaymentMethodComponent } from './payments-method.component';
import { ProductComponent } from './payments-product.component';
import { ScriptLoaderService } from './scriptloader.service';

import {
  MatButtonModule,
  MatCardModule,
  MatCheckboxModule,
  MatDatepickerModule,
  MatDialogModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatListModule,
  MatProgressSpinnerModule,
  MatRadioModule,
  MatSelectModule,
  MatSidenavModule,
  MatTableModule,
  MatToolbarModule,
} from '@angular/material';

@NgModule({
  declarations: [
    AccountComponentsComponent,
    AccountReceiptComponent,
    AccountRenewalsComponent,
    AccountTransactionsComponent,
    AccountUpgradeComponent,
    ComponentCardComponent,
    PaymentsAppComponent,
    PaymentDialogComponent,
    PaymentMethodComponent,
    ProductComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    MenuModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatSelectModule,
    MatSidenavModule,
    MatTableModule,
    MatToolbarModule,
    ReactiveFormsModule,
    RouterModule.forChild([
      {
        path: 'account',
        canActivateChild: [RMMAuthGuardService],
        children: [
          {
            path: '', outlet: 'headertoolbar',
            component: HeaderToolbarComponent
          },
          {
            path: '',
            component: PaymentsAppComponent,
            children: [
              {
                  path: 'components',
                  component: AccountComponentsComponent,
              },
              {
                  path: 'upgrades',
                  component: AccountUpgradeComponent,
              },
              {
                  path: 'renewals',
                  component: AccountRenewalsComponent,
              },
              {
                  path: 'transactions',
                  component: AccountTransactionsComponent,
              },
              {
                  path: 'receipt/:id',
                  component: AccountReceiptComponent,
              },
            ]
          }
        ]
      }
    ]),
  ],
  entryComponents: [
    PaymentDialogComponent,
  ],
  providers: [
    PaymentsService,
    ScriptLoaderService,
  ],
  bootstrap: [PaymentsAppComponent]
})

export class PaymentsAppModule { }
