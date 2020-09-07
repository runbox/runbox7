
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
import { Component, Input } from '@angular/core';

import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RMM } from '../rmm';

@Component({
    selector: 'app-runbox-container',
    styles: [`
    `],
    template: `
    <div class="app-runbox-container">
        <mat-sidenav-container class="" style="padding: 0 20px;">
            <mat-sidenav mode="side" [opened]="sidebar_opened">
            </mat-sidenav>
            <mat-sidenav-content>
                <ng-content></ng-content>
            </mat-sidenav-content>
        </mat-sidenav-container>
    </div>
    `
})

export class RunboxContainerComponent {
  @Input() sidebar_opened = false;
  constructor(public dialog: MatDialog,
    public rmm: RMM,
    public snackBar: MatSnackBar,
  ) {
  }

  show_error (message, action) {
    this.snackBar.open(message, action, {
      duration: 2000,
    });
  }
}

