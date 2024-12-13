import { Component, ElementRef, EventEmitter, Output, HostListener, AfterViewInit, Input } from '@angular/core';

@Component({
  selector: 'app-resizable-button',
  templateUrl: './resizable-button.component.html',
  styleUrls: ['./resizable-button.component.scss'],
  standalone: true,
})
export class ResizableButtonComponent implements AfterViewInit {

  @Input() width: number;
  @Output() widthChange = new EventEmitter<number>();

  private isResizing = false;
  private startX: number = 0;
  private startWidth: number = 0;
  private currentWidth: number;

  constructor(private elementRef: ElementRef) {}

  ngAfterViewInit() {
    // Initialize any necessary state after the view has been initialized
    this.currentWidth = this.elementRef.nativeElement.parentElement?.offsetWidth;
  }

  onMouseDown(event: MouseEvent) {
    this.isResizing = true;
    this.startX = event.clientX;
    const parentElement = this.elementRef.nativeElement.parentElement;
    if (parentElement) {
      this.startWidth = parentElement.offsetWidth;
    }

    // Add the mousemove event listener to the document
    document.addEventListener('mousemove', this.onMouseMove.bind(this));

    // Prevent text selection during resizing
    event.preventDefault();
  }

  onMouseMove(event: MouseEvent) {
    if (!this.isResizing) return;

    const parentElement = this.elementRef.nativeElement.parentElement;
    if (parentElement) {
      const diff = event.clientX - this.startX;
      const newWidth = this.startWidth + diff;

      // Emit the new width
      this.currentWidth = newWidth
      this.widthChange.emit(newWidth);
    }
  }

  @HostListener('document:mouseup')
  onMouseUp() {
    this.isResizing = false;

    document.removeEventListener('mousemove', this.onMouseMove.bind(this));
  }

  onKeyDown(event: KeyboardEvent) {
    if (!this.elementRef.nativeElement.contains(document.activeElement)) {
      return;
    }

    const parentElement = this.elementRef.nativeElement.parentElement;
    if (!parentElement) return;

    const step = 10; // Resize step for each key press
    const currentWidth = parentElement.offsetWidth;

    if (event.key === 'ArrowRight') {
      // Increase width
      this.currentWidth = currentWidth + step;
      this.widthChange.emit(currentWidth + step);
    } else if (event.key === 'ArrowLeft') {
      // Decrease width
      this.currentWidth = currentWidth - step;
      this.widthChange.emit(currentWidth - step);
    }
  }

  @HostListener('window:blur')
  @HostListener('window:focus')
  onWindowFocus() {
    if (this.isResizing) {
      this.isResizing = false;  // Stop resizing immediately
    }
  }
}
