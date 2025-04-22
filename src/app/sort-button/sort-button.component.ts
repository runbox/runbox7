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
  imports: [CommonModule, MatIconModule],
  selector: 'app-sort-button',
  template: `
    <button
      [disabled]="isDisabled"
      (click)="onClick()"
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
        font-weight: inherit;
        padding-left: 0;
      }

      .sort-button[disabled] {
        color: black;
      }

      .sort-button:hover {
        text-decoration: underline;
      }

      .sort-button[disabled]:hover {
        cursor: not-allowed;
        text-decoration: none;
      }
    `,
  ],
})
export class SortButtonComponent {
  @Input() order: OrderEvent = { data: Symbol('init'), direction: Direction.None };
  @Input() data: any;
  @Input() disabled?:any;

  @Output() orderChange = new EventEmitter<OrderEvent>();

  readonly Direction = Direction;

  private readonly directionCycle = new Map<Direction, Direction>([
    [Direction.Ascending, Direction.Descending],
    [Direction.Descending, Direction.Ascending],
  ]);

  private readonly hrDirectionTr = new Map<Direction, string>([
    [Direction.Ascending, 'ascending'],
    [Direction.Descending, 'descending'],
    [Direction.None, 'no particular'],
  ])

  private readonly directionIconMap = new Map<Direction, string>([
    [Direction.Ascending, 'arrow_downward'],
    [Direction.Descending, 'arrow_upward'],
    [Direction.None, 'empty'],
  ]);

  // Optional helper getter if you want cleaner template usage
  get isDisabled(): boolean {
      return this.disabled !== undefined && this.disabled !== false;
  }

  get directionIcon() {
    return (this.data === this.order?.data)
      ? this.directionIconMap.get(this.order?.direction)
      : this.directionIconMap.get(Direction.None);
  }

  get hrDirection() {
      return this.hrDirectionTr.get(this.order?.direction)
  }

  onClick(): void {
    // Set direction to Ascending when switching columns.
    const direction = (this.order?.data !== this.data)
     ? Direction.Descending
     : this.directionCycle.get(this.order?.direction) ?? Direction.Ascending

    this.orderChange.emit({
      data: this.data,
      direction,
    });
  }
}
