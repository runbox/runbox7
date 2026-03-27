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

import { PreferencesService } from '../common/preferences.service';
import { AppSettings } from '../app-settings';
import { StorageService } from '../storage.service';
import { Contact } from './contact';
import { ContactsService } from './contacts.service';
import { HttpErrorResponse } from '@angular/common/http';
import { RunboxWebmailAPI, RunboxMe, ContactSyncResult } from '../rmmapi/rbwebmail';
import { of, ReplaySubject, firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';

class MockPrefService {
  prefs = new Map<string, any>();
  preferences: ReplaySubject<Map<string, any>> = new ReplaySubject(1);
  public prefGroup = 'Desktop';

  set(level: string, key: string, entry: any) {
    this.prefs.set(`${level}:${key}`, entry);
    this.preferences.next(this.prefs);
  }
}

class MockRMMAPI {
  defaultP = true;
  prefs =  {'Desktop': {'version': 1, 'entries': new Map<string, any>()},
                 'Global': {'version': 1, 'entries': new Map<string, any>()}};
  me = of({ uid: 13 } as RunboxMe);

  syncContacts() {
    return of(new ContactSyncResult(`token-${(new Date()).getTime()}`, [
    Contact.fromVcard(
      'bleh', 'BEGIN:VCARD\r\nVERSION:3.0\r\nFN:test\r\nEMAIL;TYPE=home:test@runbox.com\r\n'
        + 'UID:dead-cafe\r\nPHOTO:http://test.url\r\nEND:VCARD'
    )
    ], [], 0));
  }
}

describe('ContactsService', () => {
  let rmmapi: MockRMMAPI;
  let storage: StorageService;
  const prefService = new MockPrefService() as unknown as PreferencesService;
  let sut: ContactsService;

  beforeEach(async () => {
    rmmapi = new MockRMMAPI();
    storage = new StorageService(rmmapi as unknown as RunboxWebmailAPI);
    sut = new ContactsService(rmmapi as unknown as RunboxWebmailAPI, prefService, storage);
  });

  describe('Avatar lookup', () => {
    it('should look up remote avatars (gravatar)', (done) => {
      prefService.set(prefService.prefGroup, 'avatarSource', 'remote' );

      prefService.preferences.pipe(take(1)).subscribe(async _ => {
        // grab gravatar if there's no local picture
        let avatarUrl = await sut.lookupAvatar('test+gravatar@runbox.com');
        expect(avatarUrl).toMatch(/gravatar/);

        // local avatar wins over gravatar
        avatarUrl = await sut.lookupAvatar('test@runbox.com');
        expect(avatarUrl).toMatch(/test.url/);

        avatarUrl = await sut.lookupAvatar('test+no+gravatar@runbox.com');
        expect(avatarUrl).toBeFalsy();

        done();
      });
    });

    it('should look up local avatars only', (done) => {
      prefService.set(prefService.prefGroup, 'avatarSource', 'local');
      prefService.preferences.pipe(take(1)).subscribe(async _ => {
        let avatarUrl = await sut.lookupAvatar('test@runbox.com');
        expect(avatarUrl).toMatch(/test.url/);

        avatarUrl = await sut.lookupAvatar('test+gravatar@runbox.com');
        expect(avatarUrl).toBeFalsy();

        done();
      });
    });

    it('should return no avatar when set to none', (done) => {
      prefService.set(prefService.prefGroup, 'avatarSource', 'none');
      prefService.preferences.pipe(take(1)).subscribe(async _ => {
        const avatarUrl = await sut.lookupAvatar('test@runbox.com');
        expect(avatarUrl).toBeFalsy();

        done();
      });
    });
  });

  describe('Contact retrieval', () => {
    it('should return contacts list', async () => {
      const contacts = await firstValueFrom(sut.contactsSubject);

      expect(Array.isArray(contacts)).toBe(true);
      expect(contacts.length).toBeGreaterThan(0);
    });

    it('should return contacts with expected email', async () => {
      const contacts = await firstValueFrom(sut.contactsSubject);

      expect(contacts.length).toBeGreaterThan(0);
      expect(contacts[0].primary_email()).toBe('test@runbox.com');
    });

    it('should provide contacts by email mapping', async () => {
      const byEmail = await firstValueFrom(sut.contactsByEmail);

      expect(typeof byEmail === 'object').toBe(true);
      expect(byEmail['test@runbox.com']).toBeDefined();
    });

    it('should look up contact by email', (done) => {
      sut.lookupContact('test@runbox.com').then(contact => {
        expect(contact).toBeDefined();
        expect(contact.primary_email()).toBe('test@runbox.com');
        done();
      });
    });

    it('should look up contact by UUID', (done) => {
      sut.lookupByUUID('dead-cafe').then(contact => {
        expect(contact).toBeDefined();
        done();
      });
    });

    it('should update contacts when processContacts is called', (done) => {
      const newContacts = [
        Contact.fromVcard('test-url', 'BEGIN:VCARD\r\nVERSION:3.0\r\nFN:New Contact\r\nEMAIL:new@test.com\r\nEND:VCARD')
      ];
      sut.processContacts(newContacts);

      setTimeout(() => {
        firstValueFrom(sut.contactsSubject).then(contacts => {
          expect(contacts.length).toBeGreaterThan(0);
          done();
        });
      }, 20);
    });
  });

  describe('Error handling', () => {
    it('should emit errors through errorLog', (done) => {
      const errors: any[] = [];
      sut.errorLog.subscribe(e => errors.push(e));

      const testError = new HttpErrorResponse({ status: 500, statusText: 'Server Error' });
      sut.apiErrorHandler(testError);

      setTimeout(() => {
        expect(errors.length).toBe(1);
        expect(errors[0]).toBe(testError);
        done();
      }, 10);
    });
  });

  describe('AvatarCache', () => {
    it('should emit when avatarCache.add is called', (done) => {
      const emissions: any[] = [];
      sut.avatarCache.changed.subscribe(() => emissions.push(true));

      sut.avatarCache.add('test@example.com', 'http://example.com/avatar.png');

      setTimeout(() => {
        expect(emissions.length).toBe(1);
        done();
      }, 10);
    });

    it('should emit when avatarCache.trash is called', (done) => {
      const emissions: any[] = [];
      sut.avatarCache.changed.subscribe(() => emissions.push(true));

      sut.avatarCache.trash('test@example.com');

      setTimeout(() => {
        expect(emissions.length).toBe(1);
        done();
      }, 10);
    });
  });

  describe('Preferences integration', () => {
    it('should respond to preference changes', (done) => {
      prefService.set(prefService.prefGroup, 'showDragHelpers', 'true');

      setTimeout(() => {
        expect(sut.showDragHelpers).toBe(true);
        done();
      }, 10);
    });
  });
});
