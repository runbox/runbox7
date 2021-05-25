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

import { Component, ChangeDetectionStrategy, Input, OnChanges, Output, EventEmitter } from '@angular/core';

import { SearchIndexDocumentData } from '../xapian/searchservice';
import { ContactHilights } from './startdesk.component';

@Component({
    selector: 'app-overview-sender-hilights',
    styleUrls: ['./sender-hilights.component.scss'],
    template: `
<mat-card class="dashdeskCard senderItem">
  <div class="contact">
    <mat-icon> {{ sender.icon }}</mat-icon> <h5> {{ sender.name }} </h5>
    <div class="messages"> {{ sender.emails.length }} messages </div>
  </div>
  <div class="subject">
    <ul>
      <li *ngFor="let email of shownEmails">
          <a routerLink="/" [fragment]="emailPath(email)"> {{ email.subject }} </a>
      </li>
    </ul>
  </div>
  <div class="showMoreLess">
    <button *ngIf="canShowMore" mat-button class="showMore" (click)="showMore.next()">
        Show {{ sender.emails.length - shownCount }} more
    </button>
    <button *ngIf="canShowLess" mat-button class="showLess" (click)="showLess.next()">
        Show less
    </button>
  </div>
</mat-card>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SenderHilightsComponent implements OnChanges {
    @Input() sender: ContactHilights;

    @Output() showMore = new EventEmitter<void>();
    @Output() showLess = new EventEmitter<void>();

    canShowMore = false;
    canShowLess = false;

    DEFAULT_SHOWN_EMAILS = 3;
    shownCount: number;
    shownEmails = [];

    ngOnChanges() {
        this.shownCount = this.sender.shownEmails || this.DEFAULT_SHOWN_EMAILS;

        this.canShowMore = this.shownCount < this.sender.emails.length;
        this.canShowLess = this.shownCount > this.DEFAULT_SHOWN_EMAILS;
        this.shownEmails = this.sender.emails.slice(0, this.shownCount);
    }

    public emailPath(email: SearchIndexDocumentData): string {
        const folderPath = email.folder.replace(/\./, '/');
        const id = email.id.slice(1);
        return `${folderPath}:${id}`;
    }
}
