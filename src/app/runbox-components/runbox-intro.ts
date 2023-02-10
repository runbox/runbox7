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
import { Component } from '@angular/core';

import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { RMM } from '../rmm';

@Component({
    selector: 'app-runbox-intro',
    styles: [`
    `],
    template: `
    <div class="app-runbox-intro">
        <h1 class="mat-h1">Runbox7 Dev Components</h1>
        <div>
            <p>
            Select a component to see how it is used and some examples.
            </p>

            <p>
            The components listed here are supposed to be re-usable.
            </p>

            <p>
                New components can be developed here and listed, that way its possible to have examples of how
                the component is used and possibly some documentation.
            </p>
        </div>
    </div>
    `
})

export class RunboxIntroComponent {
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

