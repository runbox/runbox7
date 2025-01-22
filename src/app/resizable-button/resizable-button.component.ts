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

import { Component, ElementRef, EventEmitter, Output, AfterViewInit, Input, HostListener } from '@angular/core';

@Component({
  selector: 'app-resizable-button',
  templateUrl: './resizable-button.component.html',
  styleUrls: ['./resizable-button.component.scss'],
  standalone: true,
})
export class ResizableButtonComponent implements AfterViewInit {

  @Input() width: number;
  @Output() widthChange = new EventEmitter<number>();

  isResizing = false;
  private startX: number = 0;
  private startWidth: number = 0;

  // Hold the reference to the event listeners
  private onMouseMoveListener: (event: MouseEvent) => void;
  private onMouseUpListener: () => void;
  private initialWidth: string | null = null;

  constructor(private elementRef: ElementRef) {}

  ngAfterViewInit() {
    this.initialWidth = this.parentElement.style.width
    console.log(this.initialWidth)
    this.setAbsoluteWidth()
  }

  get parentElement() {
    return this.elementRef.nativeElement.parentElement;
  }

  setAbsoluteWidth() {
    if (!this.parentElement) return

    this.widthChange.emit(this.parentElement.offsetWidth);
  }

  resetWidth() {
    const parentElement = this.elementRef.nativeElement.parentElement;

    parentElement.style.width = this.initialWidth;
    setTimeout(() => {
      this.setAbsoluteWidth()
    }, 10)
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.resetWidth();
  }

  onMouseDown(event: MouseEvent): void {
    this.isResizing = true;
    this.startX = event.clientX;
    const parentElement = this.elementRef.nativeElement.parentElement;
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

    const parentElement = this.elementRef.nativeElement.parentElement;
    if (parentElement) {
      const diff = event.clientX - this.startX;
      const newWidth = this.startWidth + diff;
      this.widthChange.emit(newWidth);
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
      this.widthChange.emit(currentWidth + step);
    } else if (event.key === 'ArrowLeft') {
      this.widthChange.emit(currentWidth - step);
    }
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
