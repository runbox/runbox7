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

import { objectEqual, withKeys, objectEqualWithKeys } from "./util";

describe('objectEqual', () => {
    it('matches empty objects', () => {
        expect(objectEqual({}, {})).toBeTrue();
    });

    it('matches 2 non empty objects', () => {
        expect(objectEqual({a: 1}, {a: 1})).toBeTrue();
    });

    it('matches nested objects', () => {
        expect(objectEqual({a: {b: 2}}, {a: {b: 2}})).toBeTrue();
    });

    it('matches nested arrays', () => {
        expect(objectEqual({a: [1, 2, 3]}, {a: [1, 2, 3]})).toBeTrue();
    });

    it('matches null and undefined', () => {
        expect(objectEqual(null, null)).toBeTrue();
        expect(objectEqual(undefined, undefined)).toBeTrue();
        expect(objectEqual(undefined, null)).toBeFalse();
        expect(objectEqual(null, undefined)).toBeFalse();
    });

    it('matches nested null objects', () => {
        expect(objectEqual({a: {}}, {b: 'bla'})).toBeFalse();
    });

    it('matches arrays with nested objects', () => {
        expect(objectEqual([{a: 1}, {b: 2}], [{a: 1}, {b: 2}])).toBeTrue();
    });

    it('can deal with circular references', () => {
        let a = {};
        a['a'] = a;
        expect(objectEqual(a, a)).toBeTrue();

        a = {};
        let b = {};
        a['x'] = b;
        b['x'] = a;
        expect(objectEqual(a, b)).toBeTrue();

        a = {a: 1};
        b = {b: 2};
        a['b'] = b;
        b['a'] = a;
        expect(objectEqual(a, b)).toBeFalse();
    });

    it('fails to match when one object is nested and another isnt', () => {
        expect(objectEqual({a: {b: 2}}, {a: 1})).toBeFalse();
    });

    it('fails to match an empty object with a non empty object', () => {
        expect(objectEqual({}, {a: 1})).toBeFalse();
        expect(objectEqual({a: 1}, {})).toBeFalse();
    });

    it('fails to match nested objects with different values', () => {
        expect(objectEqual({a: {b: 2}}, {a: {c: 3}})).toBeFalse();
    });

    it('fails to match nested arrays with different values', () => {
        expect(objectEqual({a: [1, 2, 3]}, {a: [3, 2, 1]})).toBeFalse();
        expect(objectEqual({a: [1, 2, 3]}, {a: [1]})).toBeFalse();
    });

    it('fails to match nested arrays with nested objects of different values', () => {
        expect(objectEqual([{a: 1}, {b: 2}], [{c: 3}, {d: 4}])).toBeFalse();
    });
});

describe('withKeys', () => {
    const o = {a: 1, b: 2, c: [3, 4]};

    it('returns an object with the specified keys', () => {
        expect(withKeys(o, ['a', 'b'])).toEqual({a: 1, b: 2});
    });

    it('ignores missing keys', () => {
        expect(withKeys(o, ['a', 'b', 'f'])).toEqual({a: 1, b: 2});
    });

    it('can fetch nested items', () => {
        expect(withKeys(o, ['c'])).toEqual({c: [3, 4]})
    });

    it('returns an empty object if all keys dont exist', () => {
        expect(withKeys(o, ['x', 'y', 'z'])).toEqual({})
    });

    it('returns an empty object if no keys are provided', () => {
        expect(withKeys(o, [])).toEqual({});
    });
})

describe('objectEqualWithKeys', () => {
    const o = {a: 1, b: 2, c: [3, 4], d: {e: 5}};

    // since they are both empty objects
    it('matches when no keys are specified', () => {
        expect(objectEqualWithKeys(o, o, [])).toBeTrue()
        expect(objectEqualWithKeys(o, {}, [])).toBeTrue()
        expect(objectEqualWithKeys({}, {}, [])).toBeTrue()
    });

    it('matches when provided keys that exist', () => {
        expect(objectEqualWithKeys(o, o, ['a', 'b'])).toBeTrue()
        expect(objectEqualWithKeys(o, o, ['a', 'b', 'c', 'd'])).toBeTrue()
    });

    // again, they are both empty objects
    it('matches when provided keys that dont exist', () => {
        expect(objectEqualWithKeys(o, o, ['f', 'g', 'h'])).toBeTrue()
    });

    it('matches only by keys, ignoring other values', () => {
        expect(objectEqualWithKeys(o, {a: 1, b: 2, c: 32}, ['a', 'b'])).toBeTrue()
    });

    it('matches nested objects and arrays', () => {
        expect(objectEqualWithKeys(o, {a: 25, c: [3, 4], d: {e: 5}}, ['c', 'd'])).toBeTrue()
    });

    it('fails to match if values are different', () => {
        expect(objectEqualWithKeys(o, {a: 222, b: 123}, ['a', 'b'])).toBeFalse()
        expect(objectEqualWithKeys(o, {c: [4, 5]}, ['c'])).toBeFalse()
        expect(objectEqualWithKeys(o, {d: {e: 6}}, ['d'])).toBeFalse()
    });

    it('fails to match if comparison object is empty', () => {
        expect(objectEqualWithKeys(o, {}, ['a', 'b'])).toBeFalse()
    });
});