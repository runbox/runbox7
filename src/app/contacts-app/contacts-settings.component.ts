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
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { AppSettings, AppSettingsService } from '../app-settings';
import { ContactsService } from './contacts.service';
import { Subject } from 'rxjs';

@Component({
    selector: 'app-contacts-settings',
    templateUrl: './contacts-settings.component.html',
})
export class ContactsSettingsComponent {
    syncSettings = new Subject<any>();
    appSettings: AppSettings = AppSettings.getDefaults();
    oldContacts: number;

    AvatarSource = AppSettings.AvatarSource; // makes enum visible in template

    constructor(
        public contactsservice: ContactsService,
        public settingsService: AppSettingsService,
        private rmmapi: RunboxWebmailAPI,
    ) {
        this.rmmapi.getContactsSettings().subscribe(settings => {
            const syncSettings = {};
            // eslint-disable-next-line guard-for-in
            for (const key in settings) {
                syncSettings[key] = settings[key];
            }
            this.syncSettings.next(syncSettings);
            this.syncSettings.complete();
        });

        this.contactsservice.contactsSubject.subscribe(_ => {
            this.oldContacts = this.contactsservice.migratingContacts;
        });
    }
}
