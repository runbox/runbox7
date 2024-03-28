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

import { ComponentFixture, TestBed, tick, fakeAsync, waitForAsync } from '@angular/core/testing';

import { SingleMailViewerComponent } from './singlemailviewer.component';
import { ResizerModule } from '../directives/resizer.module';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
import { MatLegacyRadioModule as MatRadioModule } from '@angular/material/legacy-radio';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AvatarBarComponent } from './avatar-bar.component';
import { RouterTestingModule } from '@angular/router/testing';

import { RunboxWebmailAPI, MessageContents } from '../rmmapi/rbwebmail';
import { ContactsService } from '../contacts-app/contacts.service';
import { MobileQueryService } from '../mobile-query.service';
import { ProgressService } from '../http/progress.service';
import { StorageService } from '../storage.service';
import { Contact, ContactKind } from '../contacts-app/contact';
import { ContactCardComponent } from './contactcard.component';
import { MessageActions } from './messageactions';
import { PreferencesService } from '../common/preferences.service';
import { MessageListService } from '../rmmapi/messagelist.service';

import { take } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';

export class ContactsServiceMock {
    public contactsSubject = of([
        new Contact({
            id: 5,
            nick: 'test',
            first_name: 'firstname',
            last_name: 'lastname',
            email: 'test@example.com'
        }),
        new Contact({
            id: 6,
            nick: 'fred@bloggs.com',
            show_external_html: true,
            kind: ContactKind.SETTINGSONLY,
            emails: [{ types: ['home'], value: 'fred@bloggs.com' }]
        })
    ]);

    lookupAvatar(_email: string) {
        return Promise.resolve(null);
    }

    lookupContact(_email: string) {
        return Promise.resolve(null);
    }
}

describe('SingleMailViewerComponent', () => {
  let component: SingleMailViewerComponent;
  let fixture: ComponentFixture<SingleMailViewerComponent>;

  beforeEach(waitForAsync(() => {
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
        MatIconTestingModule,
        MatGridListModule,
        MatToolbarModule,
        MatTooltipModule,
        MatDividerModule,
        MatExpansionModule,
        MatSnackBarModule,
        RouterTestingModule
      ],
      declarations: [AvatarBarComponent, ContactCardComponent, SingleMailViewerComponent, MatIcon],
      providers: [
        MobileQueryService,
        StorageService,
        { provide: MessageListService, useValue: { spamFolderName: 'Spam' }},
        { provide: HttpClient, useValue: {} },
        { provide: PreferencesService, useValue: {
          preferences: new ReplaySubject<Map<string, any>>(),

          set(level: string, key: string, entry: any) {
            this.preferences.pipe(take(1)).subscribe(entries => {
              entries.set(`${level}:${key}`, entry);
              this.preferences.next(this.prefs);
            });
          },
        } },
        { provide: RunboxWebmailAPI, useValue: {
          me: of({ uid: 9876 }),
          getProfiles() { return of([]); },
          getMessageContents(messageId: number): Observable<MessageContents> {
            console.log('Get message contents for', messageId);
            return of(Object.assign(new MessageContents(), {
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
            }));
          },
        } },
        { provide: ContactsService, useClass: ContactsServiceMock },
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
      deleteMessage() {
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


      expect(component.mailObj.attachments[0].downloadURL.indexOf('attachment/0')).toBeGreaterThan(-1);
      expect(component.mailObj.attachments[0].thumbnailURL.indexOf('attachmentimagethumbnail/0')).toBeGreaterThan(-1);

      expect(component.mailObj.attachments[1].downloadURL.indexOf('blob:')).toBe(0);
    }));
});
