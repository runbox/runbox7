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
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule, ErrorHandler } from '@angular/core';
import { MenuModule } from '../menu/menu.module';
import { RunboxCommonModule } from '../common/common.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SentryErrorHandler } from '../sentry-error-handler';
import { RMMAuthGuardService } from '../rmmapi/rmmauthguard.service';
import { HeaderToolbarComponent } from '../menu/headertoolbar.component';

import { AccountAppComponent } from './account-app.component';
import { AccountAddonsComponent } from './account-addons.component';
import { AccountComponentsComponent } from './account-components.component';
import { AccountFiltersComponent } from './filters/account-filters.component';
import { FilterEditorComponent } from './filters/filter-editor.component';
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
import { PaypalBillingAgreementsComponent } from './paypal-billing-agreements.component';
import { PaypalHandlerComponent } from './paypal-handler.component';
import { StripePaymentDialogComponent } from './stripe-payment-dialog.component';
import { RunboxTimerComponent } from './runbox-timer';

import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CreditCardsComponent } from './credit-cards/credit-cards.component';
import { SubAccountRenewalDialogComponent } from './sub-account-renewal-dialog';

@NgModule({
  declarations: [
    AccountAddonsComponent,
    AccountAppComponent,
    AccountComponentsComponent,
    AccountFiltersComponent,
    AccountReceiptComponent,
    AccountRenewalsComponent,
    AccountTransactionsComponent,
    AccountUpgradesComponent,
    BitpayPaymentDialogComponent,
    ComponentCardComponent,
    PaymentMethodComponent,
    PaypalBillingAgreementsComponent,
    PaypalHandlerComponent,
    PaypalPaymentDialogComponent,
    ProductComponent,
    ShoppingCartComponent,
    StripePaymentDialogComponent,
    SubAccountRenewalDialogComponent,
    RunboxTimerComponent,
    CreditCardsComponent,
    FilterEditorComponent,
  ],
  imports: [
    BrowserAnimationsModule,
    CommonModule,
    FormsModule,
    MenuModule,
    MatBadgeModule,
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
    RunboxCommonModule,
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
                  path: '',
                  component: AccountComponentsComponent,
              },
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
                  path: 'billing_agreements',
                  component: PaypalBillingAgreementsComponent,
              },
              {
                  path: 'paypal/:action',
                  component: PaypalHandlerComponent,
              },
              {
                  path: 'credit_cards',
                  component: CreditCardsComponent
              },
              {
                  path: 'filters',
                  component: AccountFiltersComponent
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
    { provide: ErrorHandler, useClass: SentryErrorHandler },
  ],
  bootstrap: []
})

export class AccountAppModule { }
