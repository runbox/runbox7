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

import { createServer, Server } from 'http';
import { createWriteStream } from 'fs';
import { mail_message_obj } from './emailresponse';

const logger = createWriteStream('mockserver.log');
function log(line) {
    logger.write(line + '\n');
}

export class MockServer {

    server: Server;

    loggedIn = true;
    challenge2fa = false;
    port = 15000;

    public start() {
        log('Starting mock server');
        this.server = createServer((request, response) => {
            if (!this.loggedIn && request.url !== '/ajax_mfa_authenticate') {
                response.end(JSON.stringify({ 'status': 'error', 'errors': ['Please login to continue'] }));
                return;
            }
            log(request.method + ' ' + request.url);
            let requesturl = request.url;
            if (requesturl.indexOf('/rest/v1/list/deleted_messages') === 0) {
                requesturl = '/rest/v1/list/deleted_messages';
            }
            if (requesturl.indexOf('/mail/download_xapian_index') === 0) {
                if (requesturl.indexOf('folder=Trash') > -1) {
                    requesturl = '/mail/download_xapian_index?trash';
                } else if (requesturl.indexOf('folder=Inbox') > -1) {
                    requesturl = '/mail/download_xapian_index?inbox';
                } else {
                    requesturl = '/mail/download_xapian_index';
                }

            }
            const emailendpoint = requesturl.match(/\/rest\/v1\/email\/([0-9]+)/);
            if (emailendpoint) {
                const mailid = emailendpoint[1];
                if (requesturl.endsWith('/html')) {
                    response.end(mail_message_obj.result.text.html);
                } else {
                    response.end(JSON.stringify(mail_message_obj));
                }
                return;
            }
            switch (requesturl) {
                case '/ajax_mfa_authenticate':
                    setTimeout(() => {
                        if (this.challenge2fa) {
                            log('2fa challenge');
                            response.end(JSON.stringify(this.auth_challenge_2fa()));
                            this.challenge2fa = false;
                        } else {
                            this.loggedIn = true;
                            log('authenticate');
                            response.end(JSON.stringify(
                                    {
                                        'message': 'Success',
                                        'code': 200
                                    }
                                ));
                        }
                        }, 1000);
                    break;
                case '/rest/v1/addresses_contact':
                    response.end(JSON.stringify({status: 'success', result: {addresses_contacts: []}}));
                    break;
                case '/rest/v1/me/defaultprofile':
                    response.end(JSON.stringify(this.defaultprofile()));
                    break;
                case '/ajax/from_address':
                    response.end(JSON.stringify(this.from_address()));
                    break;
                case '/ajax/aliases':
                    response.end(JSON.stringify({ 'status': 'success', 'aliases': [] }));
                    break;
                case '/rest/v1/email_folder/list':
                    response.end(JSON.stringify(this.emailFoldersListResponse()));
                    break;
                case '/mail/download_xapian_index':
                    response.end('');
                    break;
                case '/mail/download_xapian_index?inbox':
                    response.end(this.inboxcontents());
                    break;
                case '/mail/download_xapian_index?trash':
                    response.end(this.trashcontents());
                    break;
                case '/rest/v1/me':
                    response.end(JSON.stringify(this.me()));
                    break;
                case '/rest/v1/list/deleted_messages':
                    response.end(JSON.stringify({ 'message_ids': [], 'status': 'success' }));
                    break;
                case '/rest/v1/webpush/vapidkeys':
                    response.end(JSON.stringify(
                        {
                            'x': 'ywE13fvDmsUTdm-S7jhXLriUTUgcoq9dPBDgYPK4Nr4',
                            'crv': 'P-256', 'kty': 'EC',
                            'd': 'tLCE5wPUvfJuoDdii82wqcV0tW9xUSoKhi2zGl105cw', 'y': 'n42TE5ayD8JT-Opy9R-JEqiY-10MnPUEwf9uokGTFcs'
                        }
                    ));
                    break;
                default:
                    if (request.url.indexOf('/rest') === 0) {
                        response.end(JSON.stringify({ status: 'success' }));
                    } else {
                        response.end('');
                    }
            }
        });
        this.server.listen(this.port);
    }

    trashcontents() {
        const trashlines = [];
        for (let msg_id = 1; msg_id < 100; msg_id++) {
            trashlines.push(`${msg_id}	1548071422	1547830043	Trash	1	0	0	"Test" <test@runbox.com>	` +
                `Test2<test2@lalala.no>	Re: nonsense	709	n	 `);
        }
        return trashlines.join('\n');
    }

    inboxcontents() {
        const inboxlines = [];
        for (let msg_id = 1; msg_id < 10; msg_id++) {
            inboxlines.push(`${msg_id}	1548071422	1547830043	Inbox	1	0	0	"Test" <test@runbox.com>	` +
                `Test2<test2@lalala.no>	Re: hello	709	n	 `);
        }
        return inboxlines.join('\n');
    }

    defaultprofile() {
        return {
            'status': 'success', 'result':
            {
                'id': 111, 'reply_to': 'test@example.com',
                'folder': 'Inbox', 'name': 'Test Lastname',
                'email': 'test@example.com'
            }
        };
    }

    me() {
        return {
            'status': 'success',
            'result':
            {
                'user_address': 'test@runbox.com',
                'email_alternative': 'test@example.com',
                'last_name': 'Lastname',
                'first_name': 'Firstname',
                'username': 'test',
                'quotas': {
                    'disk_used': 527572608, 'quota_file_size': 10, 'quota': 104857600,
                    'quota_mail_size': null
                },
                'company': null, 'is_overwrite_subaccount_ip_rules': 0,
                'user_created': null, 'timezone': 'Europe/Oslo', 'uid': 221,
                'sub_accounts': ['test%subaccount.com'], 'password_strength': 5,
                'gender': null, 'has_sub_accounts': 1, 'need2pay': 'n',
                'paid': 'n', 'country': null
            }
        };
    }

    from_address() {
        return {
            'from_addresses': [
                {
                    'folder': 'Spam', 'email': 'test@example.com',
                    'reply_to': 'test@example.com',
                    'id': 22334, 'name': 'Test user'
                }],
            'status': 'success'
        };
    }

    emailFoldersListResponse() {
        return {
            'status': 'success',
            'result': {
                'folders': [
                    {
                        'old': 296,
                        'name': 'Drafts',
                        'priority': '0',
                        'id': '5',
                        'parent': null,
                        'new': 0,
                        'total': 296,
                        'folder': 'Drafts',
                        'msg_new': 0,
                        'msg_total': 296,
                        'size': '11389678',
                        'msg_size': '11389678',
                        'subfolders': [],
                        'type': 'drafts'
                    },
                    {
                        'old': 296,
                        'name': 'Inbox',
                        'priority': '0',
                        'id': '1',
                        'parent': null,
                        'new': 0,
                        'total': 296,
                        'folder': 'Inbox',
                        'msg_new': 0,
                        'msg_total': 296,
                        'size': '11389678',
                        'msg_size': '11389678',
                        'subfolders': [],
                        'type': 'inbox'
                    },
                    {
                        'old': 296,
                        'name': 'Spam',
                        'priority': '0',
                        'id': '2',
                        'parent': null,
                        'new': 0,
                        'total': 296,
                        'folder': 'Spam',
                        'msg_new': 0,
                        'msg_total': 296,
                        'size': '11389678',
                        'msg_size': '11389678',
                        'subfolders': [],
                        'type': 'spam'
                    },
                    {
                        'old': 296,
                        'name': 'Trash',
                        'priority': '0',
                        'id': '2',
                        'parent': null,
                        'new': 0,
                        'total': 296,
                        'folder': 'Trash',
                        'msg_new': 0,
                        'msg_total': 296,
                        'size': '11389678',
                        'msg_size': '11389678',
                        'subfolders': [],
                        'type': 'trash'
                    },
                ]
            }
        };
    }

    auth_challenge_2fa() {
        return {
            'user_status': '0', 'is_2fa_enabled': '1',
            'status': 'error', 'code': 401,
            'message': 'Unauthorized', 'js_action': 'show_options_screen'
        };
    }

    stop() {
        this.server.close();
    }
}
