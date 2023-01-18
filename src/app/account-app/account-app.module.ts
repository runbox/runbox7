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
import { RunboxComponentModule } from '../runbox-components/runbox-component.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SentryErrorHandler } from '../sentry-error-handler';
import { RMMAuthGuardService } from '../rmmapi/rmmauthguard.service';
import { HeaderToolbarComponent } from '../menu/headertoolbar.component';

import { AccountAppComponent } from './account-app.component';
import {
    AccountRenewalsComponent,
    AccountRenewalsAutorenewToggleComponent,
    AccountRenewalsRenewNowButtonComponent,
} from './account-renewals.component';
import { AccountReceiptComponent } from './account-receipt.component';
import { AccountTransactionsComponent } from './account-transactions.component';
import { AccountUpgradesComponent } from './account-upgrades.component';
import { AccountWelcomeComponent } from './account-welcome.component';
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
import { StripeAddCardDialogComponent } from './credit-cards/stripe-add-card-dialog.component';
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
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

import { CreditCardsComponent } from './credit-cards/credit-cards.component';
import { SubAccountRenewalDialogComponent } from './sub-account-renewal-dialog';
import { AccountSecurityModule } from '../account-security/account.security.module';
import { ProfilesComponent } from '../profiles/profiles.component';
import { ProfilesModule } from '../profiles/profiles.module';
import { CryptoPaymentDescriptionComponent } from './crypto-payment-description.component';
import { QRCodeModule } from 'angular2-qrcode';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { NoProductsForSubaccountsGuard } from './no-products-for-subaccounts.guard';
import { NoProductsForSubaccountsComponent } from './no-products-for-subaccounts.component';
import { PersonalDetailsComponent } from '../account-details/personal-details.component';
import { AccountSettingsComponent } from '../account-details/account-settings.component';
import { StorageDataComponent } from '../account-details/storage-data.component';
import { TwoFactorAuthenticationComponent } from '../account-security/two-factor-authentication.component';
import { ManageServicesComponent } from '../account-security/manage-services.component';
import { AppPasswordsComponent } from '../account-security/app-passwords.component';
import { LastLoginsComponent } from '../account-security/last-logins.component';
import { SessionsComponent } from '../account-security/sessions.component';
import { AccountPasswordComponent } from '../account-security/account-password.component';
import { DomainRegisterModule } from '../domainregister/domainregister.module';
import { DomainRegisterComponent } from '../domainregister/domainregister.component';

@NgModule({
    declarations: [
        AccountAppComponent,
        PersonalDetailsComponent,
        AccountSettingsComponent,
        StorageDataComponent,
        AccountReceiptComponent,
        AccountRenewalsComponent,
        AccountRenewalsAutorenewToggleComponent,
        AccountRenewalsRenewNowButtonComponent,
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
        StripeAddCardDialogComponent,
        StripePaymentDialogComponent,
        SubAccountRenewalDialogComponent,
        RunboxTimerComponent,
        CreditCardsComponent,
        CryptoPaymentDescriptionComponent,
        NoProductsForSubaccountsComponent,
        AccountWelcomeComponent,
    ],
    imports: [
        BrowserAnimationsModule,
        CommonModule,
        ClipboardModule,
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
        MatTabsModule,
        MatToolbarModule,
        MatTooltipModule,
        MatAutocompleteModule,
        ReactiveFormsModule,
        RunboxCommonModule,
        RunboxComponentModule,
        DomainRegisterModule,
        AccountSecurityModule,
        ProfilesModule,
        DomainRegisterModule,
        QRCodeModule,
        RouterModule.forChild([
            {
                path: 'account',
                canActivateChild: [RMMAuthGuardService, NoProductsForSubaccountsGuard],
                children: [
                    {
                        path: '',
                        outlet: 'headertoolbar',
                        component: HeaderToolbarComponent,
                    },
                    {
                        path: '',
                        component: AccountAppComponent,
                        children: [
                            {
                                path: '',
                                component: AccountWelcomeComponent,
                            },
                            {
                                path: 'plans',
                                component: AccountUpgradesComponent,
                            },
                            {
                                path: 'addons',
                                redirectTo: 'plans',
                            },
                            {
                                path: 'upgrades',
                                redirectTo: 'plans',
                            },
                            {
                                path: 'subscriptions',
                                component: AccountRenewalsComponent,
                            },
                            {
                                path: 'renewals',
                                redirectTo: 'subscriptions',
                            },
                            {
                                path: 'payments',
                                component: AccountTransactionsComponent,
                            },
                            {
                                path: 'transactions',
                                redirectTo: 'payments',
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
                                path: 'payment_cards',
                                component: CreditCardsComponent,
                            },
                            {
                                path: 'identities',
                                component: ProfilesComponent,
                            },
                            {
                                path: 'security',
                                redirectTo: '2fa',
                            },
                            {
                                path: 'account_password',
                                component: AccountPasswordComponent,
                            },
                            {
                                path: '2fa',
                                component: TwoFactorAuthenticationComponent,
                            },
                            {
                                path: 'app_passwords',
                                component: AppPasswordsComponent,
                            },
                            {
                                path: 'manage_services',
                                component: ManageServicesComponent,
                            },
                            {
                                path: 'last_logins',
                                component: LastLoginsComponent,
                            },
                            {
                                path: 'sessions',
                                component: SessionsComponent,
                            },
                            {
                                path: 'domainregistration',
                                component: DomainRegisterComponent,
                            },
                            {
                                path: 'details',
                                component: PersonalDetailsComponent,
                            },
                            {
                                path: 'storage',
                                component: StorageDataComponent,
                            },
                            {
                                path: 'preferences',
                                component: AccountSettingsComponent,
                            },
                            {
                                path: 'not-for-subaccounts',
                                component: NoProductsForSubaccountsComponent,
                            },
                            { path: 'components', redirectTo: '' },
                        ],
                    },
                ],
            },
        ]),
    ],
    providers: [CartService, PaymentsService, { provide: ErrorHandler, useClass: SentryErrorHandler }],
    bootstrap: []
})
export class AccountAppModule {}
