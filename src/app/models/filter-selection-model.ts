// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2025 Runbox Solutions AS (runbox.com).
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

import { SelectionModel } from '@angular/cdk/collections';

export class FilterSelectionModel<T> extends SelectionModel<T> {
  constructor(multiple: boolean, initialValues: T[], emitChanges: boolean, compareWith: (a: T, b: T) => boolean, predicate: (a) => boolean) {
    super(multiple, initialValues, emitChanges, compareWith);

    return new Proxy(this, {
      get(target, prop) {
        if (prop === 'select') {
          return (...items: T[]) => {
            return target.select(...items.filter(predicate));
          };
        }

        return target[prop];
      }
    });
  }
}
