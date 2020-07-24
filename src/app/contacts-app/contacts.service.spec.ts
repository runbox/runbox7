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

import { StorageService } from '../storage.service';
import { Contact } from './contact';
import { ContactsService } from './contacts.service';
import { RunboxWebmailAPI, RunboxMe, ContactSyncResult } from '../rmmapi/rbwebmail';
import { of } from 'rxjs';

describe('ContactsService', () => {
    const rmmapi = <unknown>{
        me: of({ uid: 13 } as RunboxMe),
        syncContacts: (_) => of(new ContactSyncResult(`token-${(new Date()).getTime()}`, [
          Contact.fromVcard(
              'bleh', 'BEGIN:VCARD\r\nVERSION:3.0\r\nFN:test\r\nEMAIL;TYPE=home:test@runbox.com\r\n'
                      + 'UID:dead-cafe\r\nPHOTO:http://test.url\r\nEND:VCARD'
          )
        ], [], 0)),
    } as RunboxWebmailAPI;

    it('should allow looking up avatars according to settings', async () => {
        const storage = new StorageService(rmmapi);
        storage.set('webmailSettings', { avatars: 'remote' });
        const sut = new ContactsService(rmmapi, storage);
        await new Promise(resolve => setTimeout(resolve, 0));

        // grab gravatar if there's no local picture
        let avatarUrl = await sut.lookupAvatar('test+gravatar@runbox.com');
        expect(avatarUrl).toMatch(/gravatar/);

        // local avatar wins over gravatar
        avatarUrl = await sut.lookupAvatar('test@runbox.com');
        expect(avatarUrl).toMatch(/test.url/);

        avatarUrl = await sut.lookupAvatar('test+no+gravatar@runbox.com');
        expect(avatarUrl).toBeFalsy();

        storage.set('webmailSettings', { avatars: 'local' });
        await new Promise(resolve => setTimeout(resolve, 0));

        avatarUrl = await sut.lookupAvatar('test@runbox.com');
        expect(avatarUrl).toMatch(/test.url/);

        avatarUrl = await sut.lookupAvatar('test+gravatar@runbox.com');
        expect(avatarUrl).toBeFalsy();

        storage.set('webmailSettings', { avatars: 'none' });
        await new Promise(resolve => setTimeout(resolve, 0));

        avatarUrl = await sut.lookupAvatar('test@runbox.com');
        expect(avatarUrl).toBeFalsy();

        // can enable it back again
        storage.set('webmailSettings', { avatars: 'remote' });
        await new Promise(resolve => setTimeout(resolve, 0));
        avatarUrl = await sut.lookupAvatar('test+gravatar@runbox.com');
        expect(avatarUrl).toMatch(/gravatar/);
        avatarUrl = await sut.lookupAvatar('test@runbox.com');
        expect(avatarUrl).toMatch(/test.url/);
    });
});
