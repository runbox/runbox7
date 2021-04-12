// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2021 Runbox Solutions AS (runbox.com).
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
  moduleId: 'angular2/app/dev/',
  template: `
<app-runbox-section>
    <div runbox-section-header>
        THIS IS THE TITLE IN BLUE BACKGROUND proably needs the div with id
    </div>
    <div runbox-section-content>
        <p>This is the Two-Factor Authentication (2FA) configuration screen, where you can configure the various options for enabling and using 2FA.</p>
        <p><strong>Note:</strong> For security reasons, enabling 2FA disables your account password for non-web services. These include IMAP, POP, and SMTP (for email programs/apps), FTP (for file transfer programs/apps), and CalDAV (for calendar programs/apps). Therefore you will need to set up App Passwords for these services if you want to use them.</p>
        <p><strong>Unlock code:</strong> We recommended that you create an unlock code. This special code can be used to disable 2FA if you have problems logging in with your 2FA codes.</p>
    </div>
</app-runbox-section>
  `
})
export class SectionDemoComponent { }
