// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2026 Runbox Solutions AS (runbox.com).
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

import { UntypedFormBuilder } from '@angular/forms';
import { of, ReplaySubject } from 'rxjs';
import { Contact } from '../contact';
import { ContactDetailsComponent } from './contact-details.component';

describe('ContactDetailsComponent', () => {
    function createComponent(): ContactDetailsComponent {
        const preferences = new ReplaySubject<Map<string, any>>(1);
        preferences.next(new Map([['Desktop:avatarSource', 'none']]));

        return new ContactDetailsComponent(
            {} as any,
            { matches: false } as any,
            { preferences, prefGroup: 'Desktop' } as any,
            new UntypedFormBuilder(),
            {} as any,
            {} as any,
            { params: of({}), queryParams: of({}) } as any,
            {} as any,
            {
                contactCategories: of([]),
                lookupAvatar: () => Promise.resolve(null),
            } as any,
            {} as any,
            {} as any,
        );
    }

    it('downloads the current contact as a vCard file', async () => {
        const component = createComponent();
        component.contact = Contact.fromVcard('test-url', 'BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Alice Test\r\nUID:test-id\r\nEMAIL:alice@example.com\r\nEND:VCARD');

        const anchor = document.createElement('a');
        spyOn(anchor, 'click');
        spyOn(document, 'createElement').and.returnValue(anchor);
        const createObjectUrlSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:contact');
        const revokeObjectUrlSpy = spyOn(URL, 'revokeObjectURL');

        component.downloadContactVcard();

        const blob = createObjectUrlSpy.calls.mostRecent().args[0] as Blob;
        expect(blob.type).toBe('text/vcard;charset=utf-8');
        expect(await blob.text()).toContain('FN:Alice Test');
        expect(anchor.href).toBe('blob:contact');
        expect(anchor.download).toBe('Alice Test.vcf');
        expect(anchor.click).toHaveBeenCalled();
        expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:contact');
    });

    it('uses a safe filename for contact exports', () => {
        const component = createComponent();
        component.contact = new Contact({});
        component.contact.id = 'test-id';
        component.contact.nickname = 'Alice / Bob <Team>';

        const anchor = document.createElement('a');
        spyOn(anchor, 'click');
        spyOn(document, 'createElement').and.returnValue(anchor);
        spyOn(URL, 'createObjectURL').and.returnValue('blob:contact');
        spyOn(URL, 'revokeObjectURL');

        component.downloadContactVcard();

        expect(anchor.download).toBe('Alice _ Bob _Team_.vcf');
    });
});
