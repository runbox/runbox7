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
