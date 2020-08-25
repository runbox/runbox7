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
