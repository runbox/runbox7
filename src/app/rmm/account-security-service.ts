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

export class AccountSecurityService {
    user_password: string;
    is_busy = false;
    service: any;
    results: any;
    services_translation: any = {
        web : {
            name : 'Web',
            description : 'Runbox Webmail. The web interface is essential and can not be disabled.',
            hide: true,
            priority_in_list: 70,
        },
        'dovecot-imap' : {
            name : 'IMAP',
            description : 'IMAP is used with email programs/apps to synchronize all  email in an account.',
            priority_in_list: 102,
        },
        'dovecot-pop' : {
            name : 'POP',
            description : 'POP can be used with email programs/apps to only download email from one folder.',
            priority_in_list: 99,
        },
        kmpop3d : {
            name : 'POP (kmpop3d)',
            description : 'kmpop3d is the legacy POP server, and is currently being phased out.',
            hide: true,
            priority_in_list: 100,
        },
        submission : {
            name : 'SMTP',
            description : 'SMTP is used with email programs/apps for sending outgoing email.',
            priority_in_list: 80,
        },
        ftp : {
            name : 'FTP',
            description : 'FTP can be used with programs/apps to transfer files to/from your Files area.',
            priority_in_list: -100,
        },
        webdav : {
            name : 'WebDAV',
            description : 'WebDAV is used with programs/apps to synchronize contacts (CardDAV) and calendars (CalDAV).',
            priority_in_list: 60,
        },
    };
    services_translation_ordered: any;

    constructor(
        public app: RMM,
    ) {
        const keys = Object.keys(this.services_translation);
        const services = keys.map( ( k ) => {
          this.services_translation[k].key = k;
          return this.services_translation[k];
        } );
        this.services_translation_ordered = services.sort( ( a, b ) => {
          return b.priority_in_list - a.priority_in_list;
        } );
    }

    update(data): Observable<any> {
        this.is_busy = true;
        data = data || {
        };
        const req = this.app.ua.http.put('/ajax/ajax_mfa_service', data).pipe(timeout(60000), share());
        req.subscribe(
          reply => {
            this.is_busy = false;
            if ( reply['status'] === 'error' ) {
                this.app.show_error( reply['error'].join( '' ), 'Dismiss' );
                return;
            }
            return;
          },
          error => {
            this.is_busy = false;
            return this.app.show_error('Could not update service.', 'Dismiss');
          }
        );
        return req;
    }

    create(data): Observable<any> {
        this.is_busy = true;
        data = data || {
        };
        const req = this.app.ua.http.post('/ajax/ajax_mfa_service', data).pipe(timeout(60000), share());
        req.subscribe(
          reply => {
            this.is_busy = false;
            if ( reply['status'] === 'error' ) {
                this.app.show_error( reply['error'].join( '' ), 'Dismiss' );
                return;
            }
            return;
          },
          error => {
            this.is_busy = false;
            return this.app.show_error('Could not update service.', 'Dismiss');
          }
        );
        return req;
    }

    list(): Observable<any> {
        this.is_busy = true;
        const data = {
        };
        const req = this.app.ua.http.get('/ajax/ajax_mfa_service', data).pipe(timeout(60000), share());
        req.subscribe(
          reply => {
            this.is_busy = false;
            if ( reply['status'] === 'error' ) {
                this.app.show_error( reply['error'].join( '' ), 'Dismiss' );
                return;
            }
            this.results = {};
            reply['services'].forEach( (result) => {
                result.is_enabled = result.is_enabled ? true : false;
                this.results[ result.service ] = result;
            } );
            Object.keys(this.services_translation).forEach( ( service ) => {
                if ( ! this.results[ service ] ) {
                    this.results[ service ] = {
                        is_enabled: true,
                        service: service,
                    };
                }
            } );
            return;
          },
          error => {
            this.is_busy = false;
            return this.app.show_error('Could not list services.', 'Dismiss');
          }
        );
        return req;
    }

    list_services_generic_rules(data): Observable<any> {
        this.is_busy = true;
        data = data || {
        };
        const req = this.app.ua.http.get('/ajax/ajax_mfa_service_list', data).pipe(timeout(60000), share());
        req.subscribe(
          reply => {
            this.is_busy = false;
            if ( reply['status'] === 'error' ) {
                this.app.show_error( reply['error'].join( '' ), 'Dismiss' );
                return;
            }
            return;
          },
          error => {
            this.is_busy = false;
            return this.app.show_error('Could not list service rules.', 'Dismiss');
          }
        );
        return req;
    }

}
