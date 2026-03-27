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

import { ComponentFixture, TestBed, tick, fakeAsync, waitForAsync, flush } from '@angular/core/testing';

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
import { Router } from '@angular/router';

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
  let router: Router;

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
          getRunboxDomains: () => of([{ 'id': 1, name: 'runbox.com'}]),
          getMessageContents(messageId: number): Observable<MessageContents> {
            console.log('Get message contents for', messageId);
            return of(Object.assign(new MessageContents(), {
              mid: messageId,
              headers: {
                from: {
                  value: [{ 'address': 'test@runbox.com',
                           'name': 'Testy' }]
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
    router = TestBed.inject(Router);
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
      blockSender(param: any) {
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

  it('keeps inline images visible without enabling external images', () => {
    component.messageId = 77;

    const processed = component['processMessageContents'](Object.assign(new MessageContents(), {
      headers: {
        from: {
          value: [{ address: 'test@runbox.com', name: 'Testy' }]
        },
        date: new Date(2016, 0, 1).toJSON(),
        subject: 'Inline image'
      },
      text: {
        text: 'Inline image',
        html: '<p><img src="cid:inline-logo"></p>',
        textAsHtml: '<p>Inline image</p>'
      },
      sanitized_html: '<p><img src="cid:inline-logo"></p>',
      sanitized_html_without_images: '<p>No images</p>',
      attachments: [{
        cid: 'inline-logo',
        filename: 'inline-logo.png',
        contentType: 'image/png'
      }]
    }));

    expect(processed.sanitized_html_without_images).toEqual(processed.sanitized_html);
  });

  it('still hides truly external images by default', () => {
    component.messageId = 78;

    const processed = component['processMessageContents'](Object.assign(new MessageContents(), {
      headers: {
        from: {
          value: [{ address: 'test@runbox.com', name: 'Testy' }]
        },
        date: new Date(2016, 0, 1).toJSON(),
        subject: 'External image'
      },
      text: {
        text: 'External image',
        html: '<p><img src="cid:inline-logo"><img src="https://example.com/remote.png"></p>',
        textAsHtml: '<p>External image</p>'
      },
      sanitized_html: '<p><img src="cid:inline-logo"><img src="https://example.com/remote.png"></p>',
      sanitized_html_without_images: '<p>No images</p>',
      attachments: [{
        cid: 'inline-logo',
        filename: 'inline-logo.png',
        contentType: 'image/png'
      }]
    }));

    expect(processed.sanitized_html_without_images).toBe('<p>No images</p>');
  });

  describe('mailto: link interceptor', () => {
    let messageContentsElement: HTMLElement;
    let mailtoLink: HTMLAnchorElement;
    let navigateSpy: jasmine.Spy;
    let globalPreventListener: (e: Event) => void;

    beforeEach(() => {
      // Spy on router.navigate before any tests run
      navigateSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
      
      // Create a mock messageContents element (don't append to body to avoid navigation issues)
      messageContentsElement = document.createElement('div');
      messageContentsElement.id = 'messageContents';
      
      // Set up the component's ViewChild reference
      component.messageContents = {
        nativeElement: messageContentsElement
      } as any;
      
      // Prevent all mailto: links from opening mail client during tests
      globalPreventListener = (e: Event) => {
        const target = e.target as HTMLElement;
        if (target && target.tagName === 'A') {
          const href = target.getAttribute('href');
          if (href && href.toLowerCase().startsWith('mailto:')) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
          }
        }
      };
      // Add at capture phase to catch before anything else
      document.addEventListener('click', globalPreventListener, true);
    });

    afterEach(() => {
      // Clean up - remove any links we created
      while (messageContentsElement.firstChild) {
        messageContentsElement.removeChild(messageContentsElement.firstChild);
      }
      navigateSpy.calls.reset();
    });
    
    afterAll(() => {
      // Remove global prevent listener after all tests
      if (globalPreventListener) {
        document.removeEventListener('click', globalPreventListener, true);
      }
    });
    
    afterAll(() => {
      // Remove global prevent listener after all tests
      if (globalPreventListener) {
        document.removeEventListener('click', globalPreventListener, true);
      }
    });

    it('should intercept clicks on mailto: links and navigate to compose', fakeAsync(() => {
      // Create a mailto: link - store href in data attribute to prevent browser from opening mail client
      mailtoLink = document.createElement('a');
      const hrefValue = 'mailto:test@example.com';
      mailtoLink.setAttribute('data-href', hrefValue); // Store in data attribute
      mailtoLink.href = '#'; // Use non-mailto href to prevent mail client
      mailtoLink.textContent = 'test@example.com';
      messageContentsElement.appendChild(mailtoLink);

      // Initialize the interceptor
      component['initMailtoInterceptor']();
      tick();

      // Temporarily set the href so our interceptor can read it
      mailtoLink.setAttribute('href', hrefValue);
      
      // Dispatch event on messageContentsElement (where listener is attached) with target set to link
      // This simulates the capture phase where our listener intercepts before browser processes it
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      // Set the target to the link so the listener can find it
      Object.defineProperty(clickEvent, 'target', { value: mailtoLink, writable: false });
      const preventDefaultSpy = spyOn(clickEvent, 'preventDefault');
      
      // Immediately remove href after setting up event to prevent browser from processing it
      // But our listener should have already read it
      setTimeout(() => {
        mailtoLink.href = '#';
      }, 0);
      
      // Dispatch on messageContentsElement where the capture-phase listener is attached
      messageContentsElement.dispatchEvent(clickEvent);
      tick();

      // Verify preventDefault was called
      expect(preventDefaultSpy).toHaveBeenCalled();
      
      // Verify router.navigate was called with correct parameters
      expect(navigateSpy).toHaveBeenCalledWith(
        ['/compose'],
        { queryParams: { to: 'test@example.com' } }
      );
    }));

    it('should extract email address from mailto: link correctly', fakeAsync(() => {
      // Create a mailto: link with query parameters
      mailtoLink = document.createElement('a');
      mailtoLink.href = 'mailto:user@example.com?subject=Test&body=Hello';
      mailtoLink.textContent = 'Email me';
      messageContentsElement.appendChild(mailtoLink);

      component['initMailtoInterceptor']();
      tick();

      const clickEvent = new MouseEvent('click', { 
        bubbles: true, 
        cancelable: true,
        view: window
      });
      Object.defineProperty(clickEvent, 'target', { value: mailtoLink, writable: false });
      // Dispatch on messageContentsElement where the capture-phase listener is attached
      messageContentsElement.dispatchEvent(clickEvent);
      tick();

      // Should extract just the email address, not the query params
      expect(navigateSpy).toHaveBeenCalledWith(
        ['/compose'],
        { queryParams: { to: 'user@example.com' } }
      );
    }));

    it('should handle clicks on nested elements within mailto: links', fakeAsync(() => {
      // Create a mailto: link with nested content
      mailtoLink = document.createElement('a');
      mailtoLink.href = 'mailto:nested@example.com';
      const span = document.createElement('span');
      span.textContent = 'Click me';
      mailtoLink.appendChild(span);
      messageContentsElement.appendChild(mailtoLink);

      component['initMailtoInterceptor']();
      tick();

      // Click on the nested span element - listener should walk up to find the anchor
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      Object.defineProperty(clickEvent, 'target', { value: span, writable: false });
      const preventDefaultSpy = spyOn(clickEvent, 'preventDefault');
      
      // Dispatch on messageContentsElement where the capture-phase listener is attached
      messageContentsElement.dispatchEvent(clickEvent);
      tick();

      // Should still intercept and navigate
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith(
        ['/compose'],
        { queryParams: { to: 'nested@example.com' } }
      );
    }));

    it('should handle empty email address gracefully', fakeAsync(() => {
      // Create a mailto: link without email
      mailtoLink = document.createElement('a');
      mailtoLink.href = 'mailto:';
      mailtoLink.textContent = 'Email';
      messageContentsElement.appendChild(mailtoLink);

      component['initMailtoInterceptor']();
      tick();

      const clickEvent = new MouseEvent('click', { 
        bubbles: true, 
        cancelable: true,
        view: window
      });
      Object.defineProperty(clickEvent, 'target', { value: mailtoLink, writable: false });
      const preventDefaultSpy = spyOn(clickEvent, 'preventDefault');
      // Dispatch on messageContentsElement where the capture-phase listener is attached
      messageContentsElement.dispatchEvent(clickEvent);
      tick();

      // Verify preventDefault was called to prevent browser navigation
      expect(preventDefaultSpy).toHaveBeenCalled();
      
      // Should still navigate but with empty 'to' parameter
      expect(navigateSpy).toHaveBeenCalledWith(
        ['/compose'],
        { queryParams: { to: '' } }
      );
    }));

    it('should remove old event listener when re-initializing', fakeAsync(() => {
      mailtoLink = document.createElement('a');
      mailtoLink.href = 'mailto:first@example.com';
      messageContentsElement.appendChild(mailtoLink);

      // Initialize first time
      component['initMailtoInterceptor']();
      tick();

      // Create new element and re-initialize
      const newMessageContents = document.createElement('div');
      const oldMessageContents = messageContentsElement;
      component.messageContents = {
        nativeElement: newMessageContents
      } as any;

      const removeEventListenerSpy = spyOn(oldMessageContents, 'removeEventListener');
      
      component['initMailtoInterceptor']();
      tick();

      // Should have removed listener from old element
      expect(removeEventListenerSpy).toHaveBeenCalled();
    }));

    it('should not initialize interceptor if messageContents is not available', () => {
      component.messageContents = null;
      
      // Should not throw
      expect(() => component['initMailtoInterceptor']()).not.toThrow();
    });
  });
});
