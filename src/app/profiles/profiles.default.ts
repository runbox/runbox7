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
import { RMM } from '../rmm';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';

export interface Profile {
    email: string;
    id: number;
    name: string;
    nameAndAddress: string;
    priority: number;
    reply_to: string;
    signature: string;
    type: string;
}

@Component({
    selector: 'app-profiles-default',
    styleUrls: ['profiles.default.scss'],
    templateUrl: 'profiles.default.html',
})
export class DefaultProfileComponent {
    field_errors: any;
    profiles: Profile[];
    selected: any;

    constructor(public rmm: RMM, public rmmapi: RunboxWebmailAPI, private snackBar: MatSnackBar) {
        this.selectCurrentDefault();
    }

    async fetchProfiles() {
        const froms = await this.rmmapi.getFromAddress().toPromise();
        // Sort emails alphabetically
        this.profiles = froms.sort((a, b) => (a.email < b.email ? -1 : 1));
    }

    async selectCurrentDefault() {
        await this.fetchProfiles();
        const defaultProfiles = [];
        for (const profile of this.profiles) {
            if (profile.priority === 0) {
                defaultProfiles.push(profile);
            }
        }
        if (defaultProfiles.length === 1) {
            this.selected = defaultProfiles[0];
        } else {
            this.selected = this.profiles.find(p => p.type === 'main');
        }
    }

    updateDefaultProfile() {
        const priorities: any[] = new Array();
        const priority_data = { from_priorities: priorities };
        const type_data = { type: 'main' };
        for (const profile of this.profiles) {
            if (profile === this.selected) {
                const values = { id: profile.id, from_priority: 0 };
                priorities.push(values);
                this.updateType(profile.id, type_data, this.field_errors);
            } else {
                const values = { id: profile.id, from_priority: 1 };
                priorities.push(values);
            }
        }
        this.rmm.profile.updateFromPriorities(priority_data);
    }

    updateType(id: number, values: { type: string }, field_errors: any) {
        const req = this.rmm.profile.update(id, values, field_errors);
        req.subscribe(
            (reply) => {
                if (reply['status'] === 'success') {
                    this.rmm.profile.load();
                } else if (reply['status'] === 'error') {
                    this.showNotification('Could not update Identity Type');
                    return;
                }
            }
        );
    }

    showNotification(message: string, action = 'Dismiss'): void {
        this.snackBar.open(message, action, {
            duration: 3000,
        });
    }
}
