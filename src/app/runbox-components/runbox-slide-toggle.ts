// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2018 Runbox Solutions AS (runbox.com).
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
import {
  SecurityContext,
  Component,
  Input,
  Output,
  EventEmitter,
  NgZone,
  ViewChild,
  AfterViewInit,
  ContentChild,
  ElementRef,
  TemplateRef,
} from '@angular/core';

@Component({
    selector: 'app-runbox-slide-toggle',
    styles: [`
    `],
    template: `
    <div class="app-runbox-slide-toggle"
    >
        <mat-slide-toggle
            [(checked)]="is_checked"
            (toggleChange)="toggle()"
        >
        <ng-content></ng-content>
        </mat-slide-toggle>
    </div>
    `
})

export class RunboxSlideToggleComponent {
  @Input() is_checked = true;
  constructor() {
  }
  toggle () {
    this.is_checked = this.is_checked ? false : true;
  }
}

