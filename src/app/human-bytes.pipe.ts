import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'humanBytes',
  standalone: true
})
export class HumanBytesPipe implements PipeTransform {
  public transform(value: number, decimalPlaces: number = 2): string {
    if (value === 0) {
      return '0 B';
    }

    const base = 1000;
    const suffixes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const exponent = Math.floor(Math.log(value) / Math.log(base));

    const result = (value / Math.pow(base, exponent)).toFixed(decimalPlaces);
    return `${parseFloat(result)} ${suffixes[exponent]}`;
  }
}
