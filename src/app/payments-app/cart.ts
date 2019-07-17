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

import { ProductOrder } from './product-order';

export class Cart {
    items: ProductOrder[] = [];

    add(p: ProductOrder) {
        this.items.push(p);
    }

    clear() {
        this.items = [];
    }

    contains(pid: number, apid?: number): boolean {
        for (const p of this.items) {
            if (p.pid === pid && p.apid === apid) {
                return true;
            }
        }
        return false;
    }

    remove(order: ProductOrder) {
        this.items = this.items.filter(p => p !== order);
    }
}
