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

import { AccountAppComponent } from './account-app.component';
import { AccountAddonsComponent } from './account-addons.component';
import { AccountComponentsComponent } from './account-components.component';
import { AccountRenewalsComponent } from './account-renewals.component';
import { AccountReceiptComponent } from './account-receipt.component';
import { AccountTransactionsComponent } from './account-transactions.component';
import { AccountUpgradesComponent } from './account-upgrades.component';
import { BitpayPaymentDialogComponent } from './bitpay-payment-dialog.component';
import { CartService } from './cart.service';
import { ComponentCardComponent } from './component-card.component';
import { ProductComponent } from './account-product.component';
import { ShoppingCartComponent } from './shopping-cart.component';
import { PaymentMethodComponent } from './payment-method.component';
import { PaymentsService } from './payments.service';
import { PaypalPaymentDialogComponent } from './paypal-payment-dialog.component';
import { PaypalHandlerComponent } from './paypal-handler.component';
import { StripePaymentDialogComponent } from './stripe-payment-dialog.component';

import {
  MatButtonModule,
  MatCardModule,
  MatCheckboxModule,
  MatDatepickerModule,
  MatDialogModule,
  MatExpansionModule,
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
  MatTooltipModule,
} from '@angular/material';

@NgModule({
  declarations: [
    AccountAddonsComponent,
    AccountAppComponent,
    AccountComponentsComponent,
    AccountReceiptComponent,
    AccountRenewalsComponent,
    AccountTransactionsComponent,
    AccountUpgradesComponent,
    BitpayPaymentDialogComponent,
    ComponentCardComponent,
    PaymentMethodComponent,
    PaypalHandlerComponent,
    PaypalPaymentDialogComponent,
    ProductComponent,
    ShoppingCartComponent,
    StripePaymentDialogComponent,
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
    MatExpansionModule,
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
    MatTooltipModule,
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
            component: AccountAppComponent,
            children: [
              {
                  path: 'components',
                  component: AccountComponentsComponent,
              },
              {
                  path: 'upgrades',
                  component: AccountUpgradesComponent,
              },
              {
                  path: 'addons',
                  component: AccountAddonsComponent,
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
              {
                  path: 'cart',
                  component: ShoppingCartComponent,
              },
              {
                  path: 'paypal/:action',
                  component: PaypalHandlerComponent,
              },
            ]
          }
        ]
      }
    ]),
  ],
  entryComponents: [
    BitpayPaymentDialogComponent,
    PaypalPaymentDialogComponent,
    StripePaymentDialogComponent,
  ],
  providers: [
    CartService,
    PaymentsService,
  ],
  bootstrap: []
})

export class AccountAppModule { }
