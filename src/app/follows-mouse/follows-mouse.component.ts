import { Component, ElementRef, HostListener } from '@angular/core';

@Component({
  selector: 'app-follows-mouse',
  standalone: true,
  templateUrl: './follows-mouse.component.html',
  styleUrls: ['./follows-mouse.component.scss'],
})
export class FollowsMouseComponent {

  constructor(private el: ElementRef) {
    this.el.nativeElement.style.display = 'inline-block';
    this.el.nativeElement.style.position = 'fixed';
    this.el.nativeElement.style['z-index'] = '1000';
  }

  @HostListener('document:mousemove', ['$event'])
  @HostListener('document:drag', ['$event'])
  onMouseMove(event: MouseEvent) {
    this.el.nativeElement.style.left = `${event.clientX + 4}px`;
    this.el.nativeElement.style.top = `${event.clientY + 4}px`;
  }
}
