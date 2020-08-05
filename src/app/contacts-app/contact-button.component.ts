// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2020 Runbox Solutions AS (runbox.com).
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

import { Component, Input } from '@angular/core';
import { Contact } from './contact';

@Component({
        selector: 'app-contact-button',
        template: `
<span>
    <mat-icon *ngIf="contact.show_as_company(); else show_kind"> business </mat-icon>
    <ng-template #show_kind>
        <mat-icon *ngIf="contact.kind === 'group'"> group </mat-icon>
    </ng-template>
    {{ contact.display_name() || "Unnamed contact"  }}
</span>
`,
})
export class ContactButtonComponent {
    @Input() contact: Contact;
}
