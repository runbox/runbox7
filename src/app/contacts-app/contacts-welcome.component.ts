// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2019 Runbox Solutions AS (runbox.com).
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

@Component({
    selector: 'app-contacts-welcome',
    template: `
<div style="padding: 3em;">
    <h1> Welcome to Runbox 7 Contacts! </h1>
    <p>
        Here you can view and modify your contact list. If it's your first time here,
        you may want to check out the
        <a mat-button routerLink="/contacts/settings"> <mat-icon> settings </mat-icon> Settings </a>
        to migrate your contacts to CardDAV. <br>
        This will greatly enhance their capabilities and allow you
        to synchronize them with other devices. See the settings for more details about that.
    </p>
    <p>
        The <a mat-button routerLink="/contacts/new"> <mat-icon> add </mat-icon> New contact </a>
        button will allow you to add new contacts to your addressbook: note that they will already be added
        to CardDAV and will <b>not</b> be visible in the old webmail! <br>
        The support for those “old” contacts will be removed in the future.
    </p>
    <p>
        The contacts on the left have the <mat-icon> email </mat-icon> icon next to them:
        as long as they have an email address :)
        Clicking that icon will allow you to instantly write an email to the given contact.
    </p>
    <p>
        We hope you'll enjoy using the new contacts interface. Be sure to visit
        <a href="https://community.runbox.com/c/runbox-7"> our community forum </a>
        if you have any questions or encounter any problems.
    </p>
</div>
    `
})
export class ContactsWelcomeComponent {
}
