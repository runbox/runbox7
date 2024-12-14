import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export enum Direction {
  Ascending = 'ASC',
  Descending = 'DESC',
  None = 'NONE'
}

export interface OrderEvent {
  data: any;
  direction: Direction;
}

@Component({
  standalone: true,
  imports: [CommonModule, MatIconModule], // Use MatIconModule instead of MatIcon
  selector: 'app-sort-button',
  template: `
    <button
      (click)="toggleSort()"
      class="sort-button"
      aria-live="polite"
    >
      <span>
        <ng-content></ng-content>
      </span>
      <span class="sr-only" >
          in {{this.hrDirection}} order
      </span>
      <mat-icon>{{directionIcon}}</mat-icon>
    </button>
  `,
  styles: [
    `
      .sort-button {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        background: none;
        border: none;
        font-size: inherit;
        font-weight: inherit;
      }

      .sort-button:hover {
        text-decoration: underline;
      }
    `,
  ],
})
export class SortButtonComponent {
  @Input() order: OrderEvent = { data: Symbol('init'), direction: Direction.None };
  @Input() data: any;
  @Output() orderChange = new EventEmitter<OrderEvent>();

  readonly Direction = Direction; // Make enum accessible in template

  // Map defining the state transitions
  private readonly directionCycle = new Map<Direction, Direction>([
    [Direction.Ascending, Direction.Descending],
    [Direction.Descending, Direction.None],
    [Direction.None, Direction.Ascending],
  ]);

  private readonly hrDirectionTr = new Map<Direction, string>([
    [Direction.Ascending, 'ascending'],
    [Direction.Descending, 'descending'],
    [Direction.None, 'no particular'],
  ])

  private readonly directionIconMap = new Map<Direction, string>([
    [Direction.Ascending, 'arrow_upward'],
    [Direction.Descending, 'arrow_downward'],
    [Direction.None, 'empty'],
  ]);

  get directionIcon() {

    return (this.data === this.order?.data)
      ? this.directionIconMap.get(this.order?.direction)
      : this.directionIconMap.get(Direction.None);
  }

  get hrDirection() {
      return this.hrDirectionTr.get(this.order?.direction)
  }

  toggleSort(): void {
    // Set direction to Ascending when switching columns.
    const direction = (this.order?.data !== this.data)
     ? Direction.Ascending
     : this.directionCycle.get(this.order?.direction) ?? Direction.Ascending

    this.orderChange.emit({
      data: this.data,
      direction,
    });
  }
}
