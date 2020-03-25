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

    public RUNBOX_MICRO_PID = 1001;
    public EMAIL_HOSTING_PID = 57;

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

    async add(p: ProductOrder): Promise<void> {
        const items = await this.items.pipe(take(1)).toPromise();
        // if an item like this is already ordered, increase the quantity
        for (const i of items) {
            console.log('i is currently', i);
            if (i.isSameProduct(p)) {
                i.quantity += p.quantity;
                this.items.next(items);
                return;
            }
        }
        // no product like this yet if we got this far down
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

    async remove(order: ProductOrder): Promise<void> {
        const items = await this.items.pipe(take(1)).toPromise();
        // check if it's enough to just reduce the quantity on existing product
        for (const i of items) {
            console.log('i is currently', i);
            if (i.isSameProduct(order)) {
                i.quantity -= order.quantity;
                const newItems = items.filter(o => o.quantity > 0);
                this.items.next(newItems);
                return;
            }
        }
        // if we got this far down, then no
        this.items.next(items.filter(p => !p.equals(order)));
    }

    async order_email_hosting(): Promise<void> {
        return this.add(new ProductOrder(this.EMAIL_HOSTING_PID, 1));
    }
}
