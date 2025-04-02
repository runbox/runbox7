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
    <h1> Runbox 7 Contacts </h1>
    <p>
        Runbox 7 Contacts (beta) lets you easily import, manage, and synchronize all your contacts.
    </p>
    <p>
        If it's your first time here, you may want to check out the
        <a routerLink="/contacts/settings" class="contentButton"><mat-icon svgIcon="cog"></mat-icon> Settings </a>
        button in the left pane menu.
    </p>
    <p>
	There you can migrate your existing contacts and they will then be stored in CardDAV,  the storage engine for Runbox 7 Contacts.
    </p>
    <p>
        All your contacts will then appear here and you can synchronize them with your other devices.
    </p>
    <p>
        Use the <a routerLink="/contacts/new" class="contentButton"><mat-icon svgIcon="account-plus"></mat-icon> New Contact </a>
        button to add new contacts to Runbox 7. Note that they will then be added to CardDAV and will not be visible in Runbox 6.
    </p>
    <p>
        The contacts on the left with an <mat-icon svgIcon="email"> </mat-icon> icon next to them can be clicked to write an email to the given contact.
    </p>
</div>
    `
})
export class ContactsWelcomeComponent {
}
