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
// ---------- END RUNBOX LICENSE ----------

import { Component, ChangeDetectionStrategy, Input } from '@angular/core';

import { SearchIndexDocumentData } from '../xapian/searchservice';

export interface ContactHilights {
    icon: string;
    name: string;
    emails: SearchIndexDocumentData[];
}

@Component({
    selector: 'app-overview-sender-hilights',
    styleUrls: ['./startdesk.component.scss'],
    template: `
<mat-card class="mat-card dashdeskOverview">
  <div class="contact">
    <mat-icon> {{ sender.icon }}</mat-icon> <h4> {{ sender.name }} </h4>
    <div class="messages">{{ sender.emails.length }} messages today</div>
  </div>
  <div class="subject">
    <ul>
      <li *ngFor="let email of sender.emails">
          <a routerLink="/" [fragment]="emailPath(email)"> {{ email.subject }} </a>
      </li>
    </ul>
  </div>
</mat-card>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SenderHilightsComponent {
    @Input() sender: ContactHilights;

    public emailPath(email: SearchIndexDocumentData): string {
        const folderPath = email.folder.replace(/\./, '/');
        const id = email.id.slice(1);
        return `${folderPath}:${id}`;
    }
}
