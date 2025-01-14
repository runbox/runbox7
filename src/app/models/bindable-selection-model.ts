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

export class BindableSelectionModel<T> {
  selectionModel: SelectionModel<T>;

  constructor(
    multiple: boolean,
    initialValues: T[] = [],
    emitChanges: boolean = true,
    compareWith: (a: T, b: T) => boolean = (a, b) => a === b,
  ) {
    this.selectionModel = new SelectionModel<T>(multiple, initialValues, emitChanges, compareWith);
  }

  // Getter for `selected`
  get selected(): T | T[] {
    return this.selectionModel.isMultipleSelection() ? this.selectionModel.selected : this.selectionModel.selected[0];
  }

  // Setter for `selected`
  set selected(items: T | T[]) {
    const selection = (this.selectionModel.isMultipleSelection() ? items : [items]) as T[];
    this.selectionModel.setSelection(...selection)
  }
}
