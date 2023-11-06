// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2023 Runbox Solutions AS (runbox.com).
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

import { Identity, ProfileService } from "./profile.service";
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed, waitForAsync } from '@angular/core/testing';
import { of } from 'rxjs';

describe('Identity', () => {
    it('Should create an identity with just email', () => {
        const ident = Identity.fromObject({ 'email': 'test@example.com' });
        expect(ident.nameAndAddress).toEqual('test@example.com');
    });

    it('Should create an identity with name and email', () => {
        const ident = Identity.fromObject({
            'email': 'test@example.com',
            'name':  'Fred Bloggs',
        });
        expect(ident.nameAndAddress).toEqual('Fred Bloggs <test@example.com>');
    });
});

describe('ProfileService', () => {
    let service: ProfileService;

    const DEFAULT_EMAIL = 'a2@example.com';
    let PROFILES =        [{
        'email': 'a2@example.com',
        'reference_type': 'aliases',
        'id': 16455,
        'signature': null,
        'reference': {},
        'reply_to': 'a2@example.com',
        'name': 'a2@example.com',
        'smtp_password': null,
        'from_name': 'Hallucinogen',
        'type': 'main'
    },
                           {
        'id': 16456,
        'email': 'aa1@example.com',
        'reference_type': 'aliases',
        'from_name': 'Astrix',
        'type': 'aliases',
        'reference': {
            'domainid': null,
            'id': 278,
            'localpart': 'aa1',
            'virtual_domainid': 16,
            'virtual_domain': {
                'catch_all': '',
                'status': 6,
                'id': 16,
                'name': 'example.com'
            },
        },
    },
                           {
        'email': 'testmail@testmail.com',
        'reference_type': 'aliases',
        'id': 16457,
        'signature': null,
        'reference': {},
        'name': 'John Doe',
        'from_name': 'John Doe',
        'type': 'aliases'
    },
                           {
        'from_name': 'Electric Universe',
        'type': 'external_email',
        'name': 'Electric Universe',
        'reference': {
            'save_sent': 'n',
            'signature': 'xxx',
            'use_sig_for_reply': 'NO',
            'reply_to': 'admin@runbox.com',
            'name': 'Electric Universe',
            'default_bcc': '',
            'email': 'admin@runbox.com',
            'msg_per_page': 0,
            'folder': 'Encoding Test',
            'sig_above': 'NO',
            'charset': null,
            'comp_new_window': null,
            'status': 0
        },
        'reply_to': 'admin@runbox.com',
        'signature': 'xxx',
        'id': 16448,
        'email': 'admin@runbox.com',
        'reference_type': 'preference',
    },
                           {
        'signature': '<p>ą</p>\r\n<p>eex</p>',
        'from_name': 'folder1',
        'type': 'external_email',
        'reply_to': 'admin@runbox.com',
        'reference': {
            'comp_new_window': null,
            'status': 0,
            'charset': null,
            'folder': 'LALA',
            'sig_above': 'NO',
            'email': 'admin@runbox.com',
            'msg_per_page': 0,
            'name': 'folder1',
            'reply_to': 'admin@runbox.com',
            'default_bcc': '',
            'use_sig_for_reply': 'YES',
            'signature': '<p>ą</p>\r\n<p>eex</p>',
            'save_sent': 'n'
        },
        'name': 'folder1',
        'email': 'admin@runbox.com',
        'reference_type': 'preference',
        'id': 16450
    }];

    const ALLOWED_DOMAINS = ['runbox.com', 'example.com'];

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientTestingModule,
            ],
            providers: [
                { provide: RunboxWebmailAPI, useValue: {
                    me: of({first_name: 'Test', last_name: 'User'}),
                    getProfiles: () => of(PROFILES),
                    createProfile: (newprofile) => {
                        newprofile['reference_type'] = 'aliases';
                        PROFILES.unshift(newprofile);
                        return of(PROFILES.length);
                    },
                    
                } },
                ProfileService
            ],
        }).compileComponents();
    }));
    
    beforeEach(() => { service = service = TestBed.inject(ProfileService) });

    it('loads valid profile subsets', (done) => {
        service.validProfiles.subscribe(profiles => {
            expect(profiles.length).toBe(4);
            done();
        });
    })
    it('loads all profiles', (done) => {
        service.profiles.subscribe(profiles => {
            expect(profiles.length).toBe(PROFILES.length);
            done();
        });
    })
    it('loads alias profile subsets', (done) => {
        service.aliases.subscribe(profiles => {
            expect(profiles.length).toBe(PROFILES.filter(p => p.reference_type === 'aliases').length);
            done();
        });
    })
    it('loads non alias profile subsets', (done) => {
        service.nonAliases.subscribe(profiles => {
            expect(profiles.length).toBe(2);
            done();
        });
    })
    it('loads a compose profile', () => {
        expect(service.composeProfile).toBeDefined();
        expect(service.composeProfile.email).toEqual('a2@example.com');
    })

    it('adds a new profile on create', (done) => {
        service.create({ name: 'New Profile Name',
                         email: 'newp@runbox.com',
                         from_name: 'New Profile',
                         signature: 'My sig'})
            .subscribe((res) => {
                expect(res).toBeTruthy();
                expect(PROFILES.length).toBe(PROFILES.length);
                done();
            });
                             
    });
});
