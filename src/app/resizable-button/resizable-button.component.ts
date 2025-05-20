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

import { Component, ElementRef, EventEmitter, Output, Input, HostListener, OnChanges } from '@angular/core';
import { Subject } from 'rxjs';
import { take } from 'rxjs/operators';

const userResize = new Subject()

@Component({
  selector: 'app-resizable-button',
  templateUrl: './resizable-button.component.html',
  styleUrls: ['./resizable-button.component.scss'],
  standalone: true,
})
export class ResizableButtonComponent implements OnChanges {

  @Input() width: number;
  @Output() widthChange = new EventEmitter<number>();

  isResizing = false;
  private startX: number = 0;
  private startWidth: number = 0;

  // Hold the reference to the event listeners
  private onMouseMoveListener: (event: MouseEvent) => void;
  private onMouseUpListener: () => void;

  constructor(private elementRef: ElementRef) {
    // Only set absolute value when the user does a resize.
    userResize.pipe(take(1)).subscribe(() => {
      this.setAbsoluteWidth();
    });
  }

  ngOnChanges(changes) {
    if (changes.width?.currentValue == null) {
      this.resetWidth();
    }
  }

  get parentElement() {
    return this.elementRef.nativeElement.parentElement;
  }

  setAbsoluteWidth() {
    setTimeout(() => {
      if (!this.parentElement) return

      this.changeWidth(this.parentElement.offsetWidth);
    }, 0)
  }

  resetWidth() {
    this.parentElement.style.removeProperty('width');
    this.setAbsoluteWidth()
  }

  onMouseDown(event: MouseEvent): void {
    this.isResizing = true;
    this.startX = event.clientX;
    const parentElement = this.parentElement;
    if (parentElement) {
      this.startWidth = parentElement.offsetWidth;
    }

    // Define the mouse move and up handlers
    this.onMouseMoveListener = this.onMouseMove.bind(this);
    this.onMouseUpListener = this.onMouseUp.bind(this);

    // Add the mousemove and mouseup event listeners to the document
    document.addEventListener('mousemove', this.onMouseMoveListener);
    document.addEventListener('mouseup', this.onMouseUpListener);

    // Prevent text selection during resizing
    event.preventDefault();
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isResizing) return;

    const parentElement = this.parentElement;
    if (parentElement) {
      const diff = event.clientX - this.startX;
      const newWidth = this.startWidth + diff;
      this.changeWidth(newWidth);
    }
  }

  private onMouseUp(): void {
    this.isResizing = false;
    this.removeMouseListeners();
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.elementRef.nativeElement.contains(document.activeElement)) {
      return;
    }

    const parentElement = this.elementRef.nativeElement.parentElement;
    if (!parentElement) return;

    const step = 10; // Resize step for each key press
    const currentWidth = parentElement.offsetWidth;

    if (event.key === 'ArrowRight') {
      this.changeWidth(currentWidth + step);
    } else if (event.key === 'ArrowLeft') {
      this.changeWidth(currentWidth - step);
    }
  }

  changeWidth(pixels: number) {
    this.widthChange.emit(pixels)
    userResize.next(pixels)
  }

  @HostListener('window:blur')
  @HostListener('window:focus')
  onWindowFocus(): void {
    if (this.isResizing) {
      this.isResizing = false;  // Stop resizing immediately
      this.removeMouseListeners();  // Remove listeners if resizing was interrupted
    }
  }

  private removeMouseListeners(): void {
    document.removeEventListener('mousemove', this.onMouseMoveListener);
    document.removeEventListener('mouseup', this.onMouseUpListener);
  }
}
