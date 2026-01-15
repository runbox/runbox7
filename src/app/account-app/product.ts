// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2019 Runbox Solutions AS (runbox.com).
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

Decimal.set({ precision: 2, rounding: Decimal.ROUND_HALF_EVEN });

export interface QuotaEntry {
    type: string;
    quota: number;
}

export interface QuotaEntryMap {
    [quotaType: string]: QuotaEntry;
}

export class Product {
    id:          string;
    pid:         number;
    type:        string;
    subtype?:    string;
    name:        string;
    description: string;
    details?:    string[];
    price:       Decimal;
    currency:    string;
    quotas:      QuotaEntryMap;
    sub_product_quota: QuotaEntryMap;
    over_quota?: any[];
    addons_needed?: any[];
    addon_usages?: any[];
    allow_multiple = false;
    price_with_addons?: Decimal;

    constructor(properties: any) {
        // eslint-disable-next-line guard-for-in
        for (const key in properties) {
            if (key === 'price' || key === 'price_with_addons') {
              this[key] = new Decimal(properties[key]);
            } else if (key ==='addons_needed') {
              const addons = properties[key];
              for (const addon of addons) {
                addon['quantity'] = new Decimal(addon['quantity']);
                addon['price'] = new Decimal(addon['price']);
              }
              this[key] = addons;
            } else {
                this[key] = properties[key];
            }
        }
    }
}
