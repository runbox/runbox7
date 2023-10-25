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
import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';
import { BehaviorSubject, Observable } from 'rxjs';
import { RunboxMe, RunboxWebmailAPI } from '../rmmapi/rbwebmail';

export interface FromPriority {
    from_priority: number;
    id: number;
}

export class Identity {
    email: string;
    from_name: string;
    from_priority: number;
    id: number;
    is_signature_html: boolean;
    is_smtp_enabled: boolean;
    name: string;
    reference_type: string;
    reply_to: string;
    signature: string;
    type: string;
    smtp_address: string;
    smtp_password: string;
    smtp_port: string;
    smtp_username: string;
    is_verified: boolean;
    reference: { status: number };
    preferred_runbox_domain: string;
    // FIXME: Legacy rubbish for send-folder-options
    folder: string;

    public nameAndAddress: string;

    public static fromObject(obj: any): Identity {
        const ret = Object.assign(new Identity(), obj);
        ret.resolveNameAndAddress();
        return ret;
    }
    public static fromEmailAddress(email): Identity {
        const ret = new Identity();
        ret.email = email;
        ret.reply_to = email;
        return ret;
    }

    resolveNameAndAddress() {
        this.nameAndAddress = this.name ? `${this.name} <${this.email}>` : this.email;
    }
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
    public profiles: BehaviorSubject<Identity[]> = new BehaviorSubject([]);
    public aliases: BehaviorSubject<Identity[]> = new BehaviorSubject([]);
    public nonAliases: BehaviorSubject<Identity[]> = new BehaviorSubject([]);
    public validProfiles: BehaviorSubject<Identity[]> = new BehaviorSubject([]);
    public composeProfile: Identity;
    public me: RunboxMe;
    constructor(
        public rmmapi: RunboxWebmailAPI
    ) {
        this.refresh();
        this.rmmapi.me.subscribe(me => this.me = me);
    }

    refresh() {
        this.rmmapi.getProfiles().subscribe(
            (res: Identity[]) => {
                this.validProfiles.next(res.filter(p => p.type === 'aliases' || (p.reference_type === 'preference' && p.reference.status === 0)));
                this.aliases.next(res.filter(p => p.type === 'aliases'));
                this.nonAliases.next(res.filter(p => p.type !== 'aliases'));
                this.composeProfile = res.find(p => p.from_priority === 0);
                if (!this.composeProfile) {
                    this.composeProfile = res.find(p => p.type === 'main');
                }
                this.profiles.next(res);
            }
        );
    }  
    
    create(values): Observable<boolean> {
      return this.rmmapi.createProfile(values).pipe(
          map((res: boolean) => {
              this.refresh();
              return res;
          })
      );
    }
    delete(id): Observable<boolean> {
        return this.rmmapi.deleteProfile(id).pipe(
          map((res: boolean) => {
              this.refresh();
              return res;
          })
        );
    }

    update(id, values): Observable<boolean> {
        return this.rmmapi.updateProfile(id, values).pipe(
          map((res: boolean) => {
              this.refresh();
              return res;
          })
        );
    }
    reValidate(id) {
        this.rmmapi.resendValidationEmail(id).subscribe(
            reply => {
                this.refresh();
                if ( !reply ) {
                    // snackbar error msg?
                }
          },
        );
    }
    updateFromPriorities(values: FromPriority[]) {
        this.rmmapi.updateFromPriorities(values).subscribe(
            (reply) => {
                this.refresh();
            }
        );
    }

}
