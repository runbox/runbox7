import { createServer, Server } from 'http';
import { createWriteStream } from 'fs';

const logger = createWriteStream('mockserver.log');
function log(line) {
    logger.write(line + '\n');
}

export class MockServer {

    server: Server;

    loggedIn = true;

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
                } else {
                    requesturl = '/mail/download_xapian_index';
                }

            }
            switch (requesturl) {
                case '/ajax_mfa_authenticate':
                    setTimeout(() => {
                        this.loggedIn = true;
                        log('authenticate');
                        response.end(JSON.stringify(
                            {
                                'message': 'Success',
                                'code': 200
                            }
                        ));
                    }, 1000);
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
                case '/ajax?action=ajax_getfoldercount':
                    response.end(JSON.stringify(this.foldercount()));
                    break;
                case '/mail/download_xapian_index':
                    response.end('');
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
        this.server.listen(15000);
    }

    trashcontents() {
        const trashlines = [];
        for (let msg_id = 1; msg_id < 100; msg_id++) {
            trashlines.push(`${msg_id}	1548071422	1547830043	Trash	1	0	0	"Test" <test@runbox.com>	` +
                `Test2<test2@lalala.no>	Re: nonsense	709	n	 `);
        }
        return trashlines.join('\n');
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

    foldercount() {
        return [
            [3692896, 0, 413, 'drafts', 'Drafts', 'Drafts', 0], [3692892, 2, 29, 'inbox', 'Inbox', 'Inbox', 0],
            [3692893, 0, 136, 'sent', 'Sent', 'Sent', 0],
            [3692894, 0, 0, 'spam', 'Spam', 'Spam', 0],
            [3692895, 0, 218, 'trash', 'Trash', 'Trash', 0]
        ];
    }

    stop() {
        this.server.close();
    }
}
