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
import { Identity, FromPriority, ProfileService } from './profile.service';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';

@Component({
  selector: 'app-profiles-default',
  styleUrls: ['profiles.default.scss'],
  templateUrl: 'profiles.default.html',
})
export class DefaultProfileComponent {
    field_errors: any;

    @Input() validProfiles: Identity[];
    @Input() selectedProfile: Identity;

    constructor(
        public profileService: ProfileService,
        public rmmapi: RunboxWebmailAPI,
        private snackBar: MatSnackBar
    ) {
        this.profileService.profiles.subscribe((_) => 
            this.selectedProfile = this.profileService.composeProfile
        );
    }

    updateDefaultProfile() {
        const priorities: FromPriority[] = new Array();
        let p_value = 1;
        for (const profile of this.profileService.validProfiles.value) {
            let from_p: FromPriority = {"from_priority": -1, "id": profile.id };
            if (profile.id === this.selectedProfile.id) {
                from_p.from_priority = 0;
                profile.from_priority = 0;
                priorities.push(from_p);
            } else {
                from_p.from_priority = p_value++;
                profile.from_priority = from_p.from_priority;
                priorities.push(from_p);
            }
        }
        this.profileService.updateFromPriorities(priorities);
    }

    showNotification(message: string, action = 'Dismiss'): void {
        this.snackBar.open(message, action, {
            duration: 3000,
        });
    }
}
