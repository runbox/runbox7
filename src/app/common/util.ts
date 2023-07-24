// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2023 Runbox Solutions AS (runbox.com).
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

function isLeaf(o: any): boolean {
    return !(o instanceof Object);
}

/**
 * Object equality comparison, will return true if the 2 provided objects
 * have the same keys and values.
 * 
 * @param a
 * @param b
 * @returns true if objects are equal
 */
export function objectEqual(
    a: object, 
    b: object, 
    visited: Set<object> = new Set()
): boolean {
    if (isLeaf(a)) { return a === b; }
    if (isLeaf(b)) { return false; }

    // we have a circular reference
    if (visited.has(a)) {
        return true;
    }

    if (Object.keys(a).length !== Object.keys(b).length) {
        return false;
    }

    visited.add(a);

    for (const key in a) {
        const aVal = a[key];
        const bVal = b[key];

        if (!isLeaf(aVal) && !objectEqual(aVal, bVal, visited)) {
            return false;
        } else if (isLeaf(aVal) && aVal !== bVal) {
            return false;
        }
    }

    return true;
}

/**
 * Return a new object with only the keys specified in keys.
 * 
 * @param o the object to filter from
 * @param keys the keys to fetch from o
 * @returns a new object
 */
export function withKeys(o: object, keys: any[]): object {
    return keys.reduce((acc, k) => {
        if (k in o) { acc[k] = o[k]; }
        return acc;
    }, {})
}

/**
 * Same as objectEqual, but only for the provided keys.
 * 
 * @param a 
 * @param b 
 * @param keys an array of keys to use from the object, all others ignored.
 * @returns true if objects are equal
 */
export function objectEqualWithKeys(a: object, b: object, keys: any[]): boolean {
    return objectEqual(withKeys(a, keys), withKeys(b, keys));
}