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
