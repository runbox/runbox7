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
import { ContactsService } from './contacts.service';

@Component({
    selector: 'app-contacts-settings',
    templateUrl: './contacts-settings.component.html',
})
export class ContactsSettingsComponent {

    settingsLoaded = false;
    settings:  any = {};

    constructor(
        private contactsservice: ContactsService
    ) {
        this.contactsservice.settingsSubject.subscribe(settings => {
            // tslint:disable-next-line:forin
            for (const key in settings) {
                this.settings[key] = settings[key];
            }
            this.settingsLoaded = true;
        });
        this.contactsservice.contactsSubject.subscribe(c => {
            this.settings.old_contacts_count = 0;
            for (const contact of c) {
                if (contact.rmm_backed) {
                    this.settings.old_contacts_count++;
                }
            }
        });
    }

    migrateContacts(): void {
        this.contactsservice.migrateContacts();
    }
}
