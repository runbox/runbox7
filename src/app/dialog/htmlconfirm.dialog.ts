// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2022 Runbox Solutions AS (runbox.com).
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
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';

@Component({
  template: `
      <h3 mat-dialog-title>Really show HTML version?</h3>
      <mat-dialog-content>
          <p>Showing HTML formatted messages may send tracking information to the sender,
          and may also expose you to security threats.
	  You should only show the HTML version if you trust the sender.</p>

          <p><button mat-raised-button (click)="dialogRef.close('dontask')">Manually toggle HTML</button></p>
          <p><button mat-raised-button (click)="dialogRef.close('alwaysshowhtml')">Always show HTML if available</button></p>

      </mat-dialog-content>
  `
})
export class ShowHTMLDialogComponent {
  constructor(public dialogRef: MatDialogRef<ShowHTMLDialogComponent>) {

  }
}
