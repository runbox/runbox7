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

import { Observable } from 'rxjs';
import { InjectionToken } from '@angular/core';

/**
 * Represents a contact card (vCard-like structure)
 */
export interface ContactCard {
    id: string;
    /** JMAP: address book ID (optional for Runbox) */
    addressBookId?: string;
    url?: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    nickname?: string;
    emails: { type?: string; value: string }[];
    phones?: { type?: string; value: string }[];
    addresses?: {
        type?: string;
        street?: string;
        city?: string;
        region?: string;
        postalCode?: string;
        country?: string;
    }[];
    organization?: string;
    title?: string;
    birthday?: Date;
    photo?: string;
    notes?: string;
    categories?: string[];
    kind?: 'individual' | 'group' | 'org' | 'location';
    members?: { uuid: string }[]; // For groups
}

/**
 * Result of a contact sync operation
 */
export interface ContactSyncResult {
    newSyncToken: string;
    added: ContactCard[];
    removed: string[];
    toMigrate?: number;
}

/**
 * Abstract contacts backend interface.
 * Implementations: RunboxContactsBackend, JmapContactsBackend
 */
export interface ContactsBackend {
    /**
     * Get all contacts (initial load)
     */
    getContacts(): Observable<ContactCard[]>;

    /**
     * Sync contacts since last sync token
     */
    syncContacts(syncToken?: string): Observable<ContactSyncResult>;

    /**
     * Add a new contact
     */
    addContact(contact: ContactCard): Observable<string>;

    /**
     * Modify an existing contact
     */
    modifyContact(contact: ContactCard): Observable<void>;

    /**
     * Delete a contact
     */
    deleteContact(id: string, url?: string): Observable<void>;

    /**
     * Get contact settings (e.g., default address book)
     */
    getSettings(): Observable<Record<string, unknown>>;
}

export const CONTACTS_BACKEND = new InjectionToken<ContactsBackend>('ContactsBackend');
