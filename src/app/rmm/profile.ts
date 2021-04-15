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
import { timeout, share } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { RMM } from '../rmm';
import { FromAddress } from '../rmmapi/from_address';
import { PubSub } from './pubsub';

export class Profile {
    public profiles: any;
    public profiles_verified: any;
    is_busy: boolean;
    compose_froms: any;
    public from_addresses: FromAddress[] = [];
    public pubsub;
    constructor(
        public app: RMM,
    ) {
        this.pubsub = new PubSub();
    }
    load(): Observable<any> {
        this.is_busy = true;
        const req = this.app.ua.http.get('/rest/v1/profiles', {}).pipe(timeout(60000), share());
        req.subscribe(
          reply => {
            this.is_busy = false;
            if ( reply['status'] === 'error' ) {
                this.app.show_error( reply['error'].join( '' ), 'Dismiss' );
                return;
            }
            this.profiles = reply['result'];
            return;
          },
          error => {
            this.is_busy = false;
            return this.app.show_error('Could not load profiles.', 'Dismiss');
          }
        );
        return req;
    }
    load_verified(): Observable<any> {
        this.from_addresses.splice(0, this.from_addresses.length);
        // otherwise it will lose the reference to current from list
        this.is_busy = true;
        const req = this.app.ua.http.get('/rest/v1/profiles/verified', {}).pipe(timeout(60000), share());
        req.subscribe(
          reply => {
            this.is_busy = false;
            if ( reply['status'] === 'error' ) {
                this.app.show_error( reply['error'].join( '' ), 'Dismiss' );
                return;
            }
            this.profiles_verified = reply['result'];
            const types_order = ['main', 'others', 'aliases'];
            types_order.forEach( (type) => {
                this.profiles_verified[type].forEach( (item) => {
                    const obj = {
                        id: item.profile.id,
                        email: item.profile.email,
                        reply_to: item.profile.reply_to,
                        name: item.profile.from_name,
                        signature: item.profile.signature,
                        is_signature_html: (item.profile.is_signature_html ? true : false),
                        type: item.profile.type,
                    };
                    const profile = FromAddress.fromObject(obj);
                    this.from_addresses.push(profile);
                });
            });
            this.pubsub.publish('profiles_verified.updated', [ this.profiles_verified ]);
          },
          error => {
            this.is_busy = false;
            return this.app.show_error('Could not load verified profiles.', 'Dismiss');
          }
        );
        return req;
    }
    create(values, field_errors) {
        const req = this.app.ua.http.post('/rest/v1/profile/', values).pipe(timeout(60000), share());
        req.subscribe(
          reply => {
            if ( reply['status'] === 'error' ) {
                this.app.handle_field_errors(reply, field_errors);
                return;
            }
          },
          error => {
            return this.app.show_error('Could not load profiles.', 'Dismiss');
          }
        );
        return req;
    }
    delete(id) {
        const req = this.app.ua.http.delete('/rest/v1/profile/' + id).pipe(timeout(60000), share());
        req.subscribe(reply => {
            if ( reply['status'] === 'error' ) {
                this.app.show_error( reply['error'].join( '' ), 'Dismiss' );
                return;
            }
        });
        return req;
    }
    update(id, values, field_errors) {
        const req = this.app.ua.http.put('/rest/v1/profile/' + id, values).pipe(timeout(60000), share());
        req.subscribe(
          reply => {
            if ( reply['status'] === 'error' ) {
                this.app.handle_field_errors(reply, field_errors);
                return;
            }
          },
          error => {
            return this.app.show_error('Could not load profiles.', 'Dismiss');
          }
        );
        return req;
    }
    resend(id) {
        const req = this.app.ua.http.put('/rest/v1/profile/' + id + '/resend_validation_email', {}).pipe(timeout(60000), share());
        req.subscribe(
          reply => {
            if ( reply['status'] === 'error' ) {
                return this.app.show_error('Could not resend validation email.', 'Dismiss');
            }
          },
          error => {
            return this.app.show_error('Could not resend validation email.', 'Dismiss');
          }
        );
        return req;
    }
}
