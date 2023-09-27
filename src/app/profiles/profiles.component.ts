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
import { Component, Output, EventEmitter, ViewChild } from '@angular/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MatLegacyPaginator as MatPaginator } from '@angular/material/legacy-paginator';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { ProfilesEditorModalComponent } from './profiles.editor.modal';
import { ProfileService } from './profile.service';

@Component({
  moduleId: 'angular2/app/profiles/',
  selector: 'app-profiles',
  templateUrl: 'profiles.component.html'
})

export class ProfilesComponent {
  panelOpenState = false;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @Output() Close: EventEmitter<string> = new EventEmitter();
  domain;
//  profiles: Identity[];
  alias_limits;
  dialog_ref: any;

  constructor(
    public snackBar: MatSnackBar,
    public dialog: MatDialog,
    public profileService: ProfileService,
  ) {
//    this.profileService.profiles.subscribe((profiles) => this.profiles = profiles);
    // FIXME: Need to refresh this if/when we make more aliases
    this.profileService.rmmapi.getAliasLimits().subscribe(
      res => this.alias_limits = res
    );
  }
 
  show_error (message, action) {
    this.snackBar.open(message, action, {
      duration: 2000,
    });
  }

  add_profile (type): void {
    let item = {type: type};
    this.dialog_ref = this.dialog.open(ProfilesEditorModalComponent, {
        width: '600px',
        data: item,
    });
    this.dialog_ref.componentInstance.is_create = true;
    this.dialog_ref.afterClosed().subscribe(result => {
        item = result;
    });
  }

}
