// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2024 Runbox Solutions AS (runbox.com).
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

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import {
    ContactsBackend,
    ContactCard,
    ContactSyncResult
} from '../contacts-backend.interface';
import { RunboxWebmailAPI, ContactSyncResult as ApiContactSyncResult } from '../../rmmapi/rbwebmail';
import { Contact, ContactKind, GroupMember } from '../../contacts-app/contact';

/**
 * Runbox implementation of ContactsBackend.
 * Wraps the existing RunboxWebmailAPI contact methods.
 */
@Injectable({
    providedIn: 'root'
})
export class RunboxContactsBackend implements ContactsBackend {
    constructor(private api: RunboxWebmailAPI) {}

    getContacts(): Observable<ContactCard[]> {
        return this.api.syncContacts().pipe(
            map((result: ApiContactSyncResult) =>
                result.added.map(c => this.contactToContactCard(c))
            )
        );
    }

    syncContacts(syncToken?: string): Observable<ContactSyncResult> {
        return this.api.syncContacts(syncToken).pipe(
            map((result: ApiContactSyncResult) => ({
                newSyncToken: result.newSyncToken,
                added: result.added.map(c => this.contactToContactCard(c)),
                removed: result.removed,
                toMigrate: result.toMigrate
            }))
        );
    }

    addContact(contact: ContactCard): Observable<string> {
        const runboxContact = this.contactCardToContact(contact);
        return this.api.addNewContact(runboxContact);
    }

    modifyContact(contact: ContactCard): Observable<void> {
        const runboxContact = this.contactCardToContact(contact);
        return this.api.modifyContact(runboxContact).pipe(
            map(() => undefined)
        );
    }

    deleteContact(id: string, url?: string): Observable<void> {
        const contact = new Contact({});
        contact.id = id;
        if (url) {
            contact.url = url;
        }
        return this.api.deleteContact(contact).pipe(
            map(() => undefined)
        );
    }

    getSettings(): Observable<Record<string, unknown>> {
        // Runbox doesn't have a separate settings endpoint for contacts
        return of({});
    }

    // Helper methods for data conversion

    private contactToContactCard(contact: Contact): ContactCard {
        return {
            id: contact.id,
            url: contact.url,
            fullName: contact.full_name,
            firstName: contact.first_name,
            lastName: contact.last_name,
            nickname: contact.nickname,
            emails: contact.emails.map(e => ({
                type: e.types?.join(','),
                value: e.value
            })),
            phones: contact.phones?.map(p => ({
                type: p.types?.join(','),
                value: p.value
            })),
            addresses: contact.addresses?.map(a => ({
                type: a.types?.join(','),
                street: a.value?.street,
                city: a.value?.city,
                region: a.value?.region,
                postalCode: a.value?.post_code,
                country: a.value?.country
            })),
            organization: contact.company,
            title: contact.department,
            birthday: contact.birthday ? new Date(contact.birthday) : undefined,
            photo: contact.photo,
            notes: contact.note,
            categories: contact.categories,
            kind: this.mapContactKind(contact.kind),
            members: contact.members?.map(m => ({ uuid: m.uuid }))
        };
    }

    private contactCardToContact(card: ContactCard): Contact {
        const props: Record<string, unknown> = {};

        if (card.id) props['id'] = card.id;
        if (card.fullName) props['full_name'] = card.fullName;
        if (card.firstName) props['first_name'] = card.firstName;
        if (card.lastName) props['last_name'] = card.lastName;
        if (card.nickname) props['nickname'] = card.nickname;
        if (card.organization) props['company'] = card.organization;
        if (card.title) props['department'] = card.title;
        if (card.notes) props['note'] = card.notes;
        if (card.categories) props['categories'] = card.categories;
        if (card.birthday) {
            props['birthday'] = card.birthday instanceof Date
                ? card.birthday.toISOString().split('T')[0]
                : card.birthday;
        }
        if (card.photo) props['photo'] = card.photo;

        if (card.emails?.length) {
            props['emails'] = card.emails.map(e => ({
                types: e.type?.split(',') || [],
                value: e.value
            }));
        }

        if (card.phones?.length) {
            props['phones'] = card.phones.map(p => ({
                types: p.type?.split(',') || [],
                value: p.value
            }));
        }

        if (card.addresses?.length) {
            props['addresses'] = card.addresses.map(a => ({
                types: a.type?.split(',') || [],
                value: {
                    street: a.street || '',
                    city: a.city || '',
                    region: a.region || '',
                    post_code: a.postalCode || '',
                    country: a.country || ''
                }
            }));
        }

        const contact = new Contact(props);

        if (card.url) {
            contact.url = card.url;
        }

        if (card.kind) {
            contact.kind = this.mapContactKindBack(card.kind);
        }

        // Map group members
        if (card.members?.length) {
            contact.members = card.members
                .filter(m => m.uuid)
                .map(m => GroupMember.fromUUID(m.uuid));
        }

        return contact;
    }

    private mapContactKind(kind: unknown): ContactCard['kind'] {
        const kindStr = String(kind).toLowerCase();
        switch (kindStr) {
            case 'group': return 'group';
            case 'org': return 'org';
            case 'location': return 'location';
            default: return 'individual';
        }
    }

    private mapContactKindBack(kind: ContactCard['kind']): ContactKind {
        switch (kind) {
            case 'group': return ContactKind.GROUP;
            case 'org': return ContactKind.ORG;
            case 'location': return ContactKind.LOCATION;
            default: return ContactKind.INVIDIDUAL;
        }
    }
}
