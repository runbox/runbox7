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
