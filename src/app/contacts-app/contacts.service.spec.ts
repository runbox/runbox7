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

import { PreferencesResult, PreferencesService } from '../common/preferences.service';
import { AppSettings } from '../app-settings';
import { StorageService } from '../storage.service';
import { Contact } from './contact';
import { ContactsService } from './contacts.service';
import { RunboxWebmailAPI, RunboxMe, ContactSyncResult } from '../rmmapi/rbwebmail';
import { ScreenSize, MobileQueryService } from '../mobile-query.service';
import { of } from 'rxjs';
import { take } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';

class MockPrefService {
  prefs = new Map<string, any>();
  preferences: ReplaySubject<Map<string, any>> = new ReplaySubject(1);

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
  const mq = <unknown> {
    screenSize: ScreenSize.Desktop,
    screenSizeChanged: of(ScreenSize.Desktop)
  } as MobileQueryService;

  it('should allow looking up avatars according to settings', async () => {
    const rmmapi = <unknown>new MockRMMAPI() as RunboxWebmailAPI;
    const storage = new StorageService(rmmapi);
    const prefService = <unknown>new MockPrefService() as PreferencesService;
    const sut = new ContactsService(rmmapi, prefService, storage);

    prefService.set('Global', 'avatarSource', 'remote' );

    prefService.preferences.pipe(take(1)).subscribe(async _ => {
      // grab gravatar if there's no local picture
      let avatarUrl = await sut.lookupAvatar('test+gravatar@runbox.com');
      expect(avatarUrl).toMatch(/gravatar/);

      // local avatar wins over gravatar
      avatarUrl = await sut.lookupAvatar('test@runbox.com');
      expect(avatarUrl).toMatch(/test.url/);

      avatarUrl = await sut.lookupAvatar('test+no+gravatar@runbox.com');
      expect(avatarUrl).toBeFalsy();
    });

    prefService.set('Global', 'avatarSource', 'local');
    prefService.preferences.pipe(take(1)).subscribe(async _ => {
      let avatarUrl = await sut.lookupAvatar('test@runbox.com');
      expect(avatarUrl).toMatch(/test.url/);

      avatarUrl = await sut.lookupAvatar('test+gravatar@runbox.com');
      expect(avatarUrl).toBeFalsy();
    });

    prefService.set('Global', 'avatarSource', 'none');
    prefService.preferences.pipe(take(1)).subscribe(async _ => {
      const avatarUrl = await sut.lookupAvatar('test@runbox.com');
      expect(avatarUrl).toBeFalsy();
    });

    // can enable it back again
    prefService.set('Global', 'avatarSource', 'remote');
    prefService.preferences.pipe(take(1)).subscribe(async _ => {
      let avatarUrl = await sut.lookupAvatar('test+gravatar@runbox.com');
      expect(avatarUrl).toMatch(/gravatar/);
      avatarUrl = await sut.lookupAvatar('test@runbox.com');
      expect(avatarUrl).toMatch(/test.url/);
    });
  });
});
