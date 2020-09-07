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
<div class="mainTextContent">
    <h1> Welcome to Runbox 7 Contacts </h1>
    <p>
        Here you can view and modify your contact list. If it's your first time here,
        you may want to check out the
        <a routerLink="/contacts/settings" class="contentButton"><mat-icon svgIcon="cog"></mat-icon> Settings </a>
        button at the top left corner to migrate your contacts to CardDAV, the storage engine for Runbox 7 Contacts.
    </p>
    <p>
        This will greatly enhance the contacts' capabilities and allow you to synchronize them with other devices.
	See the Settings for more details about that.
    </p>
    <p>
        The <a routerLink="/contacts/new" class="contentButton"><mat-icon svgIcon="account-plus"></mat-icon>New contact </a>
        button will allow you to add new contacts to your contact list.
	Note that they will then be added to CardDAV and will <b>not</b> be visible in Runbox 6.
    </p>
    <p>Eventually all Runbox 6 contacts will be migrated to Runbox 7, and the support for these "old" contacts will be removed.
    </p>
    <p>
        The contacts on the left have the <mat-icon svgIcon="email"> </mat-icon> icon next to them (as long as they have an email address),
	and clicking that icon will allow you to instantly write an email to the given contact.
    </p>
    <p>
        We hope you'll enjoy using the new Contacts interface. Be sure to visit
        <a href="https://community.runbox.com/c/runbox-7"> our community forum </a>
        if you have any questions or encounter any problems!
    </p>
</div>
    `
})
export class ContactsWelcomeComponent {
}
