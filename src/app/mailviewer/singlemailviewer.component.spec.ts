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

import { async, ComponentFixture, TestBed, tick, fakeAsync } from '@angular/core/testing';

import { SingleMailViewerComponent } from './singlemailviewer.component';
import { ResizerModule } from '../directives/resizer.module';
import {
  MatCheckboxModule, MatButtonModule, MatRadioModule,
  MatMenuModule, MatCardModule, MatDialogModule, MatIconModule,
  MatGridListModule, MatToolbarModule, MatTooltipModule, MatDividerModule, MatExpansionModule
} from '@angular/material';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RunboxWebmailAPI, MessageContents } from '../rmmapi/rbwebmail';
import { ContactsService } from '../contacts-app/contacts.service';
import { ProgressService } from '../http/progress.service';
import { RouterTestingModule } from '@angular/router/testing';
import { ContactCardComponent } from './contactcard.component';
import { MessageActions } from './messageactions';
import { Observable, of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MessageListService } from '../rmmapi/messagelist.service';

describe('SingleMailViewerComponent', () => {
  let component: SingleMailViewerComponent;
  let fixture: ComponentFixture<SingleMailViewerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        CommonModule,
        FormsModule,
        MatCheckboxModule,
        MatButtonModule,
        MatRadioModule,
        MatMenuModule,
        MatCardModule,
        MatDialogModule,
        ResizerModule,
        MatIconModule,
        MatGridListModule,
        MatToolbarModule,
        MatTooltipModule,
        MatDividerModule,
        MatExpansionModule,
        RouterTestingModule
      ],
      declarations: [ContactCardComponent, SingleMailViewerComponent],
      providers: [
        { provide: MessageListService, useValue: { spamFolderName: 'Spam' }},
        { provide: HttpClient, useValue: {} },
        { provide: RunboxWebmailAPI, useValue: {
          getMessageContents(messageId: number): Observable<MessageContents> {
            console.log('Get message contents for', messageId);
            return of({
              mid: messageId,
              headers: {
                from: {
                  value: 'test@runbox.com'
                },
                date: new Date(2016, 0, 1).toJSON(),
                subject: 'Test subject'
              },
              text: {
                text: 'blablabla',
                html: null,
                textAsHtml: null
              },
              attachments: [
                {
                  filename: 'test.jpg',
                  contentType: 'image/jpeg'
                },
                {
                  filename: 'test2.png',
                  contentType: 'image/png',
                  content: Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8])
                }
              ]
            });
          }
        } },
        { provide: ContactsService, useValue: {
            lookupContact(email: string) {
              return new Promise((resolve, reject) => resolve(null));
            }
        } },
        { provide: ProgressService, useValue: {} }
      ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SingleMailViewerComponent);
    component = fixture.componentInstance;
    component.messageActionsHandler = new class implements MessageActions {
      mailViewerComponent: SingleMailViewerComponent;
      moveToFolder() {
        throw new Error('Method not implemented.');
      }
      trashMessage() {
        throw new Error('Method not implemented.');
      }
      flag() {
        throw new Error('Method not implemented.');
      }
      unflag() {
        throw new Error('Method not implemented.');
      }
      reply(useHTML?: boolean) {
        throw new Error('Method not implemented.');
      }
      replyToAll(useHTML?: boolean) {
        throw new Error('Method not implemented.');
      }
      forward(useHTML?: boolean) {
        throw new Error('Method not implemented.');
      }
      markSeen(seen_flag_value?: number) {
        throw new Error('Method not implemented.');
      }
      trainSpam(params: any) {
        throw new Error('Method not implemented.');
      }
    };
    fixture.autoDetectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('show mail', fakeAsync(() => {
      expect(component).toBeTruthy();

      fixture.detectChanges();
      component.messageId = 22;
      fixture.detectChanges();
      tick(1);
      fixture.detectChanges();

      expect(component.messageHeaderHTML.nativeElement.innerText).toContain('Test subject');

      expect(component.mailObj.attachments[0].downloadURL.indexOf('attachment/0')).toBeGreaterThan(-1);
      expect(component.mailObj.attachments[0].thumbnailURL.indexOf('attachmentimagethumbnail/0')).toBeGreaterThan(-1);

      expect(component.mailObj.attachments[1].downloadURL.indexOf('blob:')).toBe(0);
    }));
});
