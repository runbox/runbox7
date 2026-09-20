// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2026 Runbox Solutions AS (runbox.com).
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

import { Decimal } from 'decimal.js-light';

import { findThreeYearSubaccountProduct } from './account-renewals.component';
import { Product } from './product';

function subaccountProduct(pid: number, price: number, diskQuota: number, type = 'addon'): Product {
    return new Product({
        pid,
        price,
        id: `subaccount-${pid}`,
        type,
        subtype: 'subaccount',
        name: `Sub-account ${pid}`,
        description: 'Test sub-account',
        currency: 'USD',
        quotas: {},
        sub_product_quota: {
            Disk: {
                type: 'bytes',
                quota: diskQuota,
            },
        },
    });
}

describe('findThreeYearSubaccountProduct', () => {
    const diskQuota = 1024 * 1024 * 1024;
    const activeSubaccount = {
        pid: 100,
        type: 'addon',
        subtype: 'subaccount',
        price: new Decimal(10),
        sub_product_quota: {
            Disk: {
                quota: diskQuota,
            },
        },
    };

    it('finds a same-quota product priced as a three-year renewal', () => {
        const oneYearProduct = subaccountProduct(100, 10, diskQuota);
        const threeYearProduct = subaccountProduct(300, 24, diskQuota);
        const differentQuotaProduct = subaccountProduct(301, 24, diskQuota * 2);

        expect(findThreeYearSubaccountProduct(activeSubaccount, [
            oneYearProduct,
            differentQuotaProduct,
            threeYearProduct,
        ])).toBe(threeYearProduct);
    });

    it('does not match other product types', () => {
        const subscriptionProduct = subaccountProduct(300, 24, diskQuota, 'subscription');

        expect(findThreeYearSubaccountProduct(activeSubaccount, [
            subscriptionProduct,
        ])).toBeUndefined();
    });

    it('uses the catalog price for the active product when it is available', () => {
        const quantityAdjustedActiveSubaccount = {
            ...activeSubaccount,
            price: new Decimal(20),
        };
        const oneYearProduct = subaccountProduct(100, 10, diskQuota);
        const threeYearProduct = subaccountProduct(300, 24, diskQuota);

        expect(findThreeYearSubaccountProduct(quantityAdjustedActiveSubaccount, [
            oneYearProduct,
            threeYearProduct,
        ])).toBe(threeYearProduct);
    });

    it('does not match non-sub-account active products', () => {
        const activeMainSubscription = {
            ...activeSubaccount,
            subtype: 'mini',
        };

        expect(findThreeYearSubaccountProduct(activeMainSubscription, [
            subaccountProduct(300, 24, diskQuota),
        ])).toBeUndefined();
    });
});
