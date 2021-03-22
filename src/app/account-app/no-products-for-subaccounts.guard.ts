// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2021 Runbox Solutions AS (runbox.com).
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

import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, CanActivateChild, CanActivate, Router } from '@angular/router';
import { AsyncSubject, Observable } from 'rxjs';
import { RunboxMe, RunboxWebmailAPI } from '../rmmapi/rbwebmail';

import { AccountAddonsComponent } from './account-addons.component';
import { AccountRenewalsComponent } from './account-renewals.component';
import { AccountTransactionsComponent } from './account-transactions.component';
import { AccountUpgradesComponent } from './account-upgrades.component';
import { CreditCardsComponent } from './credit-cards/credit-cards.component';

@Injectable({
    providedIn: 'root'
})
export class NoProductsForSubaccountsGuard implements CanActivate, CanActivateChild {
    banned_components = [
        AccountAddonsComponent,
        AccountUpgradesComponent,
        AccountTransactionsComponent,
        AccountRenewalsComponent,
        CreditCardsComponent,
    ];

    me: AsyncSubject<RunboxMe>;

    constructor(
        rmmapi: RunboxWebmailAPI,
        private router: Router,
    ) {
        this.me = rmmapi.me;
    }

    canActivate(
        route: ActivatedRouteSnapshot, _state: RouterStateSnapshot
    ): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
        const restricted = this.banned_components.find(c => route.component === c);
        if (restricted) {
            return this.me.toPromise().then(me => {
                if (me.owner) {
                    return this.router.parseUrl('/account/not-for-subaccounts');
                } else {
                    return true;
                }
            });
        } else {
            return true;
        }
    }

    canActivateChild(
        childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot
    ): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
        return this.canActivate(childRoute, state);
    }
}
