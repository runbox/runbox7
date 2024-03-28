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

import { Component, Input, OnInit } from '@angular/core';
import { ReplaySubject} from 'rxjs';
import { take } from 'rxjs/operators';
import { ProfileService } from '../profiles/profile.service';
import { ContactsService } from '../contacts-app/contacts.service';
import { PreferencesService } from '../common/preferences.service';

@Component({
    selector: 'app-avatar-bar',
    styles: [`
        img {
            height: 32px;
            border-radius: 32px;
            border: 2px solid white;
            margin-right: 3px;
            margin-left: -24px;
            transition: 0.3s;
        }

        img:nth-child(1) {
            margin-left: 0px;
        }

        div:hover img {
            margin-left: 0px;
        }
    `],
    template: `
        <div style="display: flex;">
           <img *ngFor="let email of emails; let i=index"
             [ngStyle]="{'z-index': email[1]}"
             [src]="email[0]" alt=""
           >
        </div>
    `,
})
export class AvatarBarComponent implements OnInit {
    @Input() email: {
        from: string[],
        to:   string[],
        cc:   string[],
        bcc:  string[],
    };
    emails: [string, number][] = [];

    ownAddresses: ReplaySubject<Set<string>> = new ReplaySubject(1);

    constructor(
        preferenceService:  PreferencesService,
        private contactsservice: ContactsService,
        private profileService: ProfileService
    ) {
        preferenceService.preferences.subscribe(_ => this.ngOnChanges());
    }

    ngOnInit() {
        this.profileService.validProfiles.subscribe(
            froms => this.ownAddresses.next(new Set(froms.map(f => f.email.toLowerCase()))),
            _err  => this.ownAddresses.next(new Set([])),
        );
    }

    async ngOnChanges() {
        this.emails = []; // so that we don't display the old, wrong ones while we're loading new ones

        const own = await this.ownAddresses.pipe(take(1)).toPromise();

        const emails: string[] = [].concat.apply(
            [], [this.email.from, this.email.to, this.email.cc, this.email.bcc]
        ).filter(x => x).map(email => email.address);

        const urlLookups = emails.filter(
            email => email && !own.has(email.toLowerCase())
        ).map(
            email => this.contactsservice.lookupAvatar(email)
        );

        Promise.all(urlLookups).then((urls: string[]) => {
            const found = urls.filter(x => x);
            this.emails = found.map((url, i) => [url, found.length - i]);
        });
    }
}
