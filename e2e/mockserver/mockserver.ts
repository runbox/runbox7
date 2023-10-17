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

    calendars = [
        { id: 'mock cal', displayname: 'Mock Calendar' },
    ];

    events = [];

    folders = [
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
    ];

    vtimezone_oslo =
`BEGIN:VCALENDAR
PRODID:-//citadel.org//NONSGML Citadel calendar//EN
VERSION:2.0
BEGIN:VTIMEZONE
TZID:/citadel.org/20210210_1/Europe/Oslo
LAST-MODIFIED:20210210T123706Z
X-LIC-LOCATION:Europe/Oslo
X-PROLEPTIC-TZNAME:LMT
BEGIN:STANDARD
TZNAME:CET
TZOFFSETFROM:+0043
TZOFFSETTO:+0100
DTSTART:18950101T000000
END:STANDARD
BEGIN:DAYLIGHT
TZNAME:CEST
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
DTSTART:19160522T010000
RDATE:19400810T230000
RDATE:19430329T020000
RDATE:19440403T020000
RDATE:19450402T020000
RDATE:19650425T020000
RDATE:19800406T020000
END:DAYLIGHT
BEGIN:STANDARD
TZNAME:CET
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
DTSTART:19160930T000000
RDATE:19421102T030000
RDATE:19431004T030000
RDATE:19441002T030000
RDATE:19451001T030000
END:STANDARD
BEGIN:DAYLIGHT
TZNAME:CEST
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
DTSTART:19590315T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=3SU;UNTIL=19640315T010000Z
END:DAYLIGHT
BEGIN:STANDARD
TZNAME:CET
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
DTSTART:19590920T030000
RRULE:FREQ=YEARLY;BYMONTH=9;BYDAY=3SU;UNTIL=19650919T010000Z
END:STANDARD
BEGIN:STANDARD
TZNAME:CET
TZOFFSETFROM:+0100
TZOFFSETTO:+0100
DTSTART:19800101T000000
END:STANDARD
BEGIN:STANDARD
TZNAME:CET
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
DTSTART:19800928T030000
RRULE:FREQ=YEARLY;BYMONTH=9;BYDAY=-1SU;UNTIL=19950924T010000Z
END:STANDARD
BEGIN:DAYLIGHT
TZNAME:CEST
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
DTSTART:19810329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZNAME:CET
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
DTSTART:19961027T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE
END:VCALENDAR
`;

    public start() {
        log('Starting mock server');
        this.server = createServer((request, response) => {
            const e2eFixture = request.url.match(/\/rest\/e2e\/(\w+)/);
            if (e2eFixture) {
                log(e2eFixture[1]);
                const command = e2eFixture[1];
                if (command === 'logout') {
                    log('ms pre: logout');
                    this.loggedIn = false;
                    log('ms post: logout');
                }
                if (command === 'require2fa') {
                    this.challenge2fa = true;
                }
                if (command === 'disable2fa') {
                    this.challenge2fa = false;
                }
                response.end();
                return;
            }

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
                let message_obj = mail_message_obj;
                if (mailid === '11') {
                    message_obj = JSON.parse(JSON.stringify(mail_message_obj));
                    const to = message_obj.result.headers['to'];
                    delete message_obj.result.headers['to'];
                    message_obj.result.headers['cc'] = to;
                    message_obj.result.headers['subject'] = "No 'To', just 'CC'";
                }
                if (mailid === '12') {
                    message_obj = JSON.parse(JSON.stringify(mail_message_obj));
                    message_obj.result.headers['to'].value[0].address = "TESTMAIL@TESTMAIL.COM";
                    message_obj.result.headers['to'].text = "TESTMAIL@TESTMAIL.COM";
                    message_obj.result.headers['subject'] = "Default from fix test";
                }
                if (mailid === '13') {
                    message_obj = JSON.parse(JSON.stringify(mail_message_obj));
                    const to = message_obj.result.headers['to'];
                    delete message_obj.result.headers['to'];
                    message_obj.result.headers['cc'] = to;
                    message_obj.result.headers['subject'] = "";
                }
                // This one warns, we couldnt find it!
                if (mailid === '14') {
                    message_obj = {
                        'status':'warning',
                        'errors': [
                            'Email content missing'
                        ]
                    };
                }

                if (requesturl.endsWith('/html')) {
                    response.end(message_obj.result.text.html);
                } else {
                    response.end(JSON.stringify(message_obj));
                }
                return;
            }
            const receiptendpoint = requesturl.match('/\/rest\/v1\/account_product\/receipt\/([0-9]+)');
            if (receiptendpoint) {
                response.end(JSON.stringify(this.receipt()));
                return;
            }
            if (requesturl.startsWith('/rest/v1/contacts/sync')) {
                response.end(JSON.stringify(
                    {
                        status: 'success',
                        result: {
                            newToken: `e2e-${new Date()}`,
                            added: this.contacts(),
                            removed: [],
                            to_migrate: 0,
                        }
                    }
                ));
                return;
            }
            switch (requesturl) {
                case '/ajax_mfa_authenticate':
                    setTimeout(() => {
                        if (this.challenge2fa) {
                            log('2fa challenge');
                            response.end(JSON.stringify(this.auth_challenge_2fa()));
                            this.challenge2fa = false;
                            return;
                        } else {
                            this.loggedIn = true;
                            log('authenticate');
                            response.end(JSON.stringify(
                                    {
                                        'message': 'Success',
                                        'code': 200
                                    }
                            ));
                            return;
                        }
                        }, 1000);
                    break;
                case '/rest/v1/aliases/limits':
                    response.end(JSON.stringify({ "total": 10, "current": 4}));
                    break;
                case '/rest/v1/profiles':
                    response.end(JSON.stringify(this.profiles_verified()));
                    break;
                case '/rest/v1/profiles/verified':
                    response.end(JSON.stringify(this.profiles_verified()));
                    break;
                case '/rest/v1/account_product/available':
                    response.end(JSON.stringify(this.availableProducts()));
                    break;
                case '/rest/v1/account_product/active':
                    response.end(JSON.stringify(this.activeProducts()));
                    break;
                case '/rest/v1/account_product/product_domain/1234':
                    response.end(JSON.stringify(this.productDomain1234()));
                    break;
                case '/rest/v1/account_product/cart':
                    response.end(JSON.stringify(this.availableProducts()));
                    break;
                case '/rest/v1/account_product/order':
                    response.end(JSON.stringify(this.order()));
                    break;
                case '/rest/v1/account_product/payment_methods':
                    response.end(JSON.stringify(this.payment_methods()));
                break;
                case '/rest/v1/account/usage':
                    response.end(JSON.stringify(this.usageDetails()));
                    break;
                case '/rest/v1/calendar/calendars':
                    response.end(JSON.stringify(this.getCalendars()));
                    break;
                case '/rest/v1/calendar/events':
                case '/rest/v1/calendar/events_raw':
                    this.handleEvents(request, response);
                    break;
                case '/rest/v1/email_folder/create':
                    this.createFolder(request, response);
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
                case '/_ics/Europe/Oslo.ics':
                    response.end(this.vtimezone_oslo);
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
        // id=11: email with no "To"
        inboxlines.push(`11	1548071422	1547830043	Inbox	1	0	0	"Test" <test@runbox.com>	` +
                `Test2<test2@lalala.no>	No 'To', just 'CC'	709	n	 `);

        // id=12: email with capitalized "To" email
        inboxlines.push(`12	1548071423	1547830044	Inbox	1	0	0	"Test" <test@runbox.com>	` +
                `Test2<test2@lalala.no>	Default from fix test	709	n	 `);

        // id=13: email with no "To" or Subject
        inboxlines.push(`13	1548071424	1547830045	Inbox	1	0	0	"Test" <test@runbox.com>	` +
                `Test2<test2@lalala.no>		709	n	 `);

        // id=14: broken email
        inboxlines.push(`14	1548071425	1547830046	Inbox	1	0	0	"Test" <test@runbox.com>	` +
                `Test2<test2@lalala.no>	Default from fix test	709	n	 `);

        return inboxlines.join('\n');
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
                'currency': 'EUR',
                'user_created': null, 'timezone': 'Europe/Oslo', 'uid': 221,
                'sub_accounts': ['test%subaccount.com'], 'password_strength': 5,
                'gender': null, 'has_sub_accounts': 1, 'need2pay': 'n',
                'paid': 'n', 'country': null
            }
        };
    }

    activeProducts() {
        return {
            'status': 'success',
            'result': [
                {
                    "apid":         1234,
                    "subtype":      "domain",
                    "type":         "addon",
                    "active_from":  "2019-11-11T10:31:26",
                    "active_until": "2029-11-11T10:31:26",
                    "name":         "register .INC 10 year(s)",
                    "pid":          3456,
                    "active":       true,
                    "quantity":     1,
                    "quotas": {
                        "VirtualDomain": {
                            "type": "upgrade",
                            "quota": 1
                        }
                    }
                }
            ],
        };
    }

    productDomain1234() {
        return {
            'status': 'success',
            'result': 'monsters.inc',
        };
    }

    availableProducts() {
        return {
            'status': 'success',
            'result': {
                'products': [
                    {
                        'name':        'Runbox Test',
                        'type':        'subscription',
                        'subtype':     'test',
                        'price':       '13.37',
                        'currency':    'EUR',
                        'pid':         '9001',
                        'description': 'Test subscription including some stuff',
                        "quotas": {
                            "Alias": {
                                "quota": 100,
                                "type": "fixed"
                            },
                            "File": {
                                "type": "fixed",
                                "quota": 2147483648
                            },
                            "Traffic": {
                                "quota": 10737418240,
                                "type": "fixed"
                            },
                            "VirtualDomain": {
                                "quota": 10,
                                "type": "fixed"
                            },
                            "Disk": {
                                "type": "fixed",
                                "quota": 26843545600
                            },
                            "Msg": {
                                "quota": 5000,
                                "type": "fixed"
                            },
                            "Sent": {
                                "type": "fixed",
                                "quota": 500
                            }
                        },
                    },
                    {
                        'name':        'Runbox Addon',
                        'type':        'addon',
                        'subtype':     'emailaddon',
                        'price':       '5.55',
                        'currency':    'EUR',
                        'pid':         '9002',
                        'description': 'More cool stuff for your account',
                        "quotas": {
                            "VirtualDomain": {
                                "type": "upgrade",
                                "quota": 1
                            }
                        },
                    }
                ]
            }
        };
    }

    usageDetails() {
        return {
            'status': 'success',
            "result": {
                "File": {
                    "name": "File Storage",
                    "usage": 3020561,
                    "percentage_used": 0.140655832365155,
                    "quota": 2147483648,
                    "type": "bytes"
                },
                "Subaccount": {
                    "usage": 12,
                    "name": "Medium Subaccounts",
                    "type": "absolute",
                    "percentage_used": 9.67741935483871,
                    "quota": 124
                },
                "Disk": {
                    "percentage_used": 3.30549178716655,
                    "quota": 27917287424,
                    "type": "bytes",
                    "usage": 922803643,
                    "name": "Mail Storage"
                },
                "MicroSubaccount": {
                    "quota": 0,
                    "percentage_used": 0,
                    "type": "absolute",
                    "usage": 0,
                    "name": "Micro Subaccounts"
                },
                "MaxSubaccount": {
                    "type": "absolute",
                    "quota": 0,
                    "percentage_used": 0,
                    "usage": 0,
                    "name": "Max Subaccounts"
                },
                "MiniSubaccount": {
                    "percentage_used": 11.0,
                    "quota": 100,
                    "type": "absolute",
                    "name": "Mini Subaccounts",
                    "usage": 11
                },
                "HostedDomain": {
                    "quota": 0,
                    "percentage_used": 0,
                    "type": "absolute",
                    "name": "Hosted Domains",
                    "usage": 0
                },
                "Sent": {
                    "name": "Sent Email",
                    "usage": 0,
                    "quota": 500,
                    "percentage_used": 0,
                    "type": "absolute"
                },
                "VirtualDomain": {
                    "usage": 5,
                    "name": "Domain Names",
                    "type": "absolute",
                    "percentage_used": 41.6666666666667,
                    "quota": 12
                },
                "Max250Subaccount": {
                    "quota": 0,
                    "percentage_used": 0,
                    "type": "absolute",
                    "usage": 0,
                    "name": "Max250 Subaccounts"
                },
                "Max100Subaccount": {
                    "percentage_used": 0,
                    "quota": 0,
                    "type": "absolute",
                    "name": "Max100 Subaccounts",
                    "usage": 0
                },
                "Msg": {
                    "name": "Received Email",
                    "usage": 3,
                    "percentage_used": 0.06,
                    "quota": 5000,
                    "type": "absolute"
                },
                "Alias": {
                    "type": "absolute",
                    "quota": 100,
                    "percentage_used": 13.0,
                    "name": "Aliases",
                    "usage": 13
                }
            },
        };
    }

    createFolder(request, response) {
        let body = '';
        request.on('readable', () => {
            body += request.read() || '';
        });
        request.on('end', () => {
            const params = JSON.parse(body);
            this.folders.push({
                'name': params.new_folder,
                'priority': '999',
                'id': '999',
                'old': 999,
                'parent': null,
                'new': 0,
                'total': 0,
                'folder': params.new_folder,
                'msg_new': 0,
                'msg_total': 0,
                'size': '0',
                'msg_size': '0',
                'subfolders': [],
                'type': 'user'
            });
            response.end(JSON.stringify({ 'status': 'success' }));
        });
    }

    receipt() {
        return {
            'status': 'success',
            'result': {}
        };
    }

    order() {
        return {
            'status': 'success',
            'result': {
                'total': '13.37',
                'tid':   '31337',
            }
        };
    }

    payment_methods() {
        return {
            'status': 'success',
            'result': {
                'default': null,
                'payment_methods': [
                    {
                        'id': 'e2e_pm_1',
                        'created': 1569212345,
                        'card': {
                            'exp_month': 12,
                            'exp_year': 2020,
                            'brand': 'visa',
                            'last4': 1234,
                            'wallet': null,
                        },
                    },
                    {
                        'id': 'e2e_pm_2',
                        'created': 1569212345,
                        'card': {
                            'exp_month': 12,
                            'exp_year': 2020,
                            'brand': 'mastercard',
                            'last4': 4321,
                            'wallet': { 'type': 'apple_pay' },
                        },
                    }
                ],
            }
        };
    }

    getCalendars() {
        return {
            'status': 'success',
            'result': {
                'calendars': this.calendars,
            }
        };
    }

    handleEvents(request: any, response: any) {
        if (request.method === 'PUT') {
            let body = '';
            request.on('readable', () => {
                body += request.read() || '';
            });
            request.on('end', () => {
                const event = JSON.parse(body);
                event['id'] = 'mock-event-' + (this.events.length + 1);
                this.events.push(event);
                response.end(JSON.stringify({
                    'status': 'success',
                    'result': {
                        'id': event['id']
                    },
                }));
            });
        }

        if (request.method === 'GET') {
            response.end(JSON.stringify({
                'status': 'success',
                'result': {
                    'events': this.events,
                },
            }));
        }
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
            'result': { 'folders': this.folders }
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

    profiles_verified() {
        return {
                'result': 
                    [{
                        'smtp_username': null,
                        'email': 'a2@example.com',
                        'reference_type': 'aliases',
                        'id': 16455,
                        'smtp_port': null,
                        'smtp_address': null,
                        'is_smtp_enabled': 0,
                        'signature': null,
                        'reference': {},
                        'reply_to': 'a2@example.com',
                        'name': 'a2@example.com',
                        'smtp_password': null,
                        'from_name': 'Hallucinogen',
                        'type': 'aliases'
                    },
                    {
                        'id': 16456,
                        'email': 'aa1@example.com',
                        'reference_type': 'aliases',
                        'smtp_username': null,
                        'from_name': 'Astrix',
                        'smtp_password': null,
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
                        'smtp_username': null,
                        'email': 'testmail@testmail.com',
                        'reference_type': 'aliases',
                        'id': 16457,
                        'smtp_port': null,
                        'smtp_address': null,
                        'is_smtp_enabled': 0,
                        'signature': null,
                        'reference': {},
                        'name': 'John Doe',
                        'smtp_password': null,
                        'from_name': 'John Doe',
                        'type': 'aliases'
                    },
                     {
                      'smtp_password': null,
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
                      'smtp_address': null,
                      'is_smtp_enabled': 0,
                      'signature': 'xxx',
                      'smtp_port': null,
                      'id': 16448,
                      'email': 'admin@runbox.com',
                      'reference_type': 'preference',
                      'smtp_username': null
                     },
                     {

                         'smtp_address': null,
                         'signature': '<p>ą</p>\r\n<p>eex</p>',
                         'is_smtp_enabled': 0,
                         'smtp_port': null,
                         'from_name': 'folder1',
                         'smtp_password': null,
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
                         'smtp_username': null,
                         'id': 16450
                     }
                    ]
        };
    }

    contacts(): any[] {
        return [
            [
                "/contacts/ID-MR-POSTCODE.vcf",
                "BEGIN:VCARD\nVERSION:3.0\nNICKNAME:Postpat\nN:Postcode;Patrick;;;\nUID:ID-MR-POSTCODE\nORG:Post Office #42\n"
                + "TEL;TYPE=work:333333333\nEMAIL;TYPE=work:patrick@post.no\nFN:Postpat\nEND:VCARD"
            ],
            [
                "/contacts/ID-GROUP1.vcf",
                "BEGIN:VCARD\nVERSION:4.0\nUID:ID-GROUP1\nKIND:GROUP\nFN:Group #1\nMEMBER:urn:uuid:ID-GROUP1-MEMBER1\nEND:VCARD",
            ],
            [
                "/contacts/ID-GROUP1-MEMBER1.vcf",
                "BEGIN:VCARD\nVERSION:3.0\nUID:ID-GROUP1-MEMBER1\nFN:Group #1 member #1\nNOTE:member 1-1 note\nEND:VCARD",
            ],
        ];
    }
}
