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

import { Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { take } from 'rxjs/operators';

import { ProductOrder } from './product-order';
import { StorageService } from '../storage.service';

@Injectable()
export class CartService {
    items = new ReplaySubject<ProductOrder[]>(1);

    constructor(
        private storage: StorageService,
    ) {
        this.storage.get('shoppingCart').then(cart => {
            const items = cart ? cart.map(i => new ProductOrder(i.pid, i.quantity, i.apid)) : [];
            this.items.next(items);
        });

        this.items.subscribe(items => {
            this.storage.set('shoppingCart', items);
        });
    }

    async add(p: ProductOrder) {
        const items = await this.items.pipe(take(1)).toPromise();
        items.push(p);
        this.items.next(items);
    }

    clear() {
        this.items.next([]);
    }

    async contains(pid: number, apid?: number): Promise<boolean> {
        const items = await this.items.pipe(take(1)).toPromise();
        for (const p of items) {
            if (p.pid === pid && p.apid === apid) {
                return true;
            }
        }
        return false;
    }

    async remove(order: ProductOrder) {
        const items = await this.items.pipe(take(1)).toPromise();
        this.items.next(items.filter(p => !p.equals(order)));
    }
}
