import { Directive, ElementRef, EventEmitter, OnDestroy, Output } from '@angular/core';

@Directive({
  selector: '[appResizeObserver]',
  standalone: true,
})
export class ResizeObserverDirective implements OnDestroy {
  @Output() resize = new EventEmitter<ResizeObserverEntry[]>();

  private observer: ResizeObserver;

  constructor(private elementRef: ElementRef) {
    console.log('yes i am called', this)
    this.observer = new ResizeObserver((entries) => this.resize.emit(entries));
    this.observer.observe(this.elementRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer.disconnect();
  }
}
