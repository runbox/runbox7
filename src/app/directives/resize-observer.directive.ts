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

import { Directive, ElementRef, EventEmitter, OnDestroy, Output } from '@angular/core';

@Directive({
  selector: '[appResizeObserver]',
  standalone: true,
})
export class ResizeObserverDirective implements OnDestroy {
  @Output() resize = new EventEmitter<ResizeObserverEntry>();
  @Output() horizontalResize = new EventEmitter<ResizeObserverEntry>();
  @Output() verticalResize = new EventEmitter<ResizeObserverEntry>();

  private observer: ResizeObserver;
  private lastSize: { width: number; height: number } | null = null;

  constructor(private elementRef: ElementRef) {
    this.observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) return;

      const { width, height } = entry.contentRect;

      if (this.lastSize) {
        if (this.lastSize.width !== width) {
          this.horizontalResize.emit(entry);
        }

        if (this.lastSize.height !== height) {
          this.verticalResize.emit(entry);
        }
      }

      this.resize.emit(entry);
      this.lastSize = { width, height };
    });

    this.observer.observe(this.elementRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer.disconnect();
  }
}
