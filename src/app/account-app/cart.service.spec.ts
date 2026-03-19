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

import { CartService } from './cart.service';
import { ProductOrder } from './product-order';
import { StorageService } from '../storage.service';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { firstValueFrom, of } from 'rxjs';
import { Decimal } from 'decimal.js-light';

Decimal.set({ precision: 2, rounding: Decimal.ROUND_HALF_EVEN });

describe('CartService', () => {
    const storage = new StorageService({ me: of({ uid: 42 }) } as RunboxWebmailAPI);

    it('should store ProductOrders between invocations', async () => {
        localStorage.clear();
        let cart = new CartService(storage);
        cart.clear();

        const order = new ProductOrder(401, 'subscription', new Decimal(3));
        cart.add(order);
        expect(await cart.contains(401)).toBe(true, 'cart contains the added product');

        cart = new CartService(storage);
        expect(await cart.contains(401)).toBe(true, 'fresh cart also contains the added product');
    });

    it('should distinguish between orders and renewals', async () => {
        localStorage.clear();
        const cart = new CartService(storage);

        const order = new ProductOrder(401,'subscription', new Decimal(3), 402);
        await cart.add(order);
        console.log(await firstValueFrom(cart.items));
        expect(await cart.contains(401, 402)).toBe(true, 'cart contains the renewal product');
        expect(await cart.contains(401)).toBe(false, 'cart does not contain the new product');
    });

    it('should be possible to remove ordered products', async () => {
        localStorage.clear();
        const cart = new CartService(storage);

        const order = new ProductOrder(402,'subscription', new Decimal(1));
        await cart.add(order);
        expect(await cart.contains(402)).toBe(true, 'cart contains the ordered product');
        await cart.remove(new ProductOrder(402,'subscription', new Decimal(1)));
        expect(await cart.contains(402)).toBe(false, 'cart contains the product no more');
    });

    it('should be possible to clear the cart', async () => {
        localStorage.clear();
        const cart = new CartService(storage);

        await cart.add(new ProductOrder(403,'subscription', new Decimal(1)));
        await cart.add(new ProductOrder(404,'add-on', new Decimal(1)));
        await cart.add(new ProductOrder(405,'add-on', new Decimal(1)));
        expect(await cart.contains(403)).toBe(true, 'cart contains added products');
        expect(await cart.contains(404)).toBe(true, 'cart contains added products');
        expect(await cart.contains(405)).toBe(true, 'cart contains added products');
        cart.clear();
        expect(await cart.contains(403)).toBe(false, 'cart contains added products no more');
        expect(await cart.contains(404)).toBe(false, 'cart contains added products no more');
        expect(await cart.contains(405)).toBe(false, 'cart contains added products no more');
    });

    it('should add/subtract quantities on duplicate products', async () => {
        localStorage.clear();
        const cart = new CartService(storage);

        await cart.add(new ProductOrder(403, 'add-on', new Decimal(1)));
        await cart.add(new ProductOrder(403, 'add-on', new Decimal(1)));
        await cart.remove(new ProductOrder(403, 'add-on', new Decimal(1)));
        expect(await cart.contains(403)).toBe(true, 'cart contains added products');
        await cart.remove(new ProductOrder(403, 'add-on', new Decimal(1)));
        expect(await cart.contains(403)).toBe(false, 'cart contains added products no more');
        await cart.remove(new ProductOrder(403, 'add-on', new Decimal(1)));
        expect(await cart.contains(403)).toBe(false, 'cart contains added products no more');
    });

  it('should not add more than one subscription product', async () => {
        localStorage.clear();
        const cart = new CartService(storage);

        await cart.add(new ProductOrder(403, 'subscription', new Decimal(1)));
        await cart.add(new ProductOrder(404, 'subscription', new Decimal(1)));
        expect(await cart.contains(403)).toBe(true, 'cart contains added products');
        expect(await cart.contains(404)).toBe(false, 'cart does not contain 2nd subscription');
    });

    // RxJS 7 specific tests for firstValueFrom with ReplaySubject
    describe('RxJS 7 firstValueFrom patterns', () => {
        it('should resolve firstValueFrom on items ReplaySubject', async () => {
            localStorage.clear();
            const cart = new CartService(storage);

            // Wait for initial items
            const items = await firstValueFrom(cart.items);
            expect(items).toBeDefined();
            expect(Array.isArray(items)).toBe(true);
        });

        it('should handle concurrent firstValueFrom calls', async () => {
            localStorage.clear();
            const cart = new CartService(storage);
            cart.clear();

            await cart.add(new ProductOrder(500, 'add-on', new Decimal(1)));

            // Concurrent reads should all get the same value
            const [items1, items2, items3] = await Promise.all([
                firstValueFrom(cart.items),
                firstValueFrom(cart.items),
                firstValueFrom(cart.items),
            ]);

            expect(items1.length).toBe(1);
            expect(items2.length).toBe(1);
            expect(items3.length).toBe(1);
        });

        it('should get updated items after add operation', async () => {
            localStorage.clear();
            const cart = new CartService(storage);
            cart.clear();

            await cart.add(new ProductOrder(600, 'add-on', new Decimal(2)));

            const items = await firstValueFrom(cart.items);
            expect(items.length).toBe(1);
            expect(items[0].pid).toBe(600);
            expect(items[0].quantity.toNumber()).toBe(2);
        });

        it('should get updated items after remove operation', async () => {
            localStorage.clear();
            const cart = new CartService(storage);
            cart.clear();

            await cart.add(new ProductOrder(700, 'add-on', new Decimal(3)));
            await cart.remove(new ProductOrder(700, 'add-on', new Decimal(1)));

            const items = await firstValueFrom(cart.items);
            expect(items.length).toBe(1);
            expect(items[0].quantity.toNumber()).toBe(2);
        });
    });
});
