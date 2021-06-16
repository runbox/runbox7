export const mail_message_obj = {
    'status': 'success',
    'result': {
        'folder': 'Inbox',
        'message_tags': [],
        'attachments': [],
        'answered_flag': 0,
        'parserVersion': 20180617,
        'text': {
            'textAsHtml': '<p>Test</p>',
            'html': '<div dir="ltr">Test</div>\n',
            'text': 'Test\n',
            'type': 'text'
        },
        'sanitized_html': '<div dir="ltr">Test</div>\n',
        'mid': '11574228',
        'flagged_flag': 0,
        'seen_flag': 1,
        'headers': {
            'x-dspam-confidence': '0.9997',
            'x-dspam-result': 'Innocent',
            // tslint:disable-next-line:max-line-length
            'x-spam-status': 'No, score=-0.1 required=4.0 tests=DKIM_SIGNED,DKIM_VALID, DKIM_VALID_AU,FREEMAIL_FROM,HTML_MESSAGE,SPF_PASS,TVD_SPACE_RATIO shortcircuit=no autolearn=disabled version=3.4.1',
            // tslint:disable-next-line:max-line-length
            'x-spam-cmauthority': 'v=2.2 cv=Jr2zl4wC c=1 sm=1 tr=0 a=x7bEGLp0ZPQA:10 a=GWjfIYgdE1YA:10 a=JHtHm7312UAA:10 a=1FzqG5ILVBdwvA7Y_sMA:9 a=QEXdDO2ut3YA:10',
            'x-spam-checker-version': 'SpamAssassin 3.4.1 (2015-04-28) on antispam04.runbox.com',
            'dkim-signature': {
                'params': {
                    'bh': 'a7Ao6kN1QFn9ZmQ9B511W/QMfksdW72vy7yNkqOKuFI=',
                    's': '20161025',
                    'c': 'relaxed/relaxed',
                    'h': 'mime-version:from:date:message-id:subject:to',
                    'a': 'rsa-sha256',
                    // tslint:disable-next-line:max-line-length
                    'b': 'fAghfyTMj2U66cEyLbcgHKkmDFTH56E2Xp/xG6ZpFgRK/5mmXhS/pP/GgCTBVpi5YB c0JCPd6bm1ir6BgfHzhLjdK1YjaLTvBkhJ4hQrlBmqUat4VIYtlgO8XuO/VAeK7i+LWn LYthb62wshCk87NAbitDcBJLG6IYT4VahdSqhQ0ukgPyXBqXF945Sxgl8YuJAmow819Y ZO+2egl9qxmWnCigjl87f2IicA6hJ2xdGEKGX7qzVamcFyUXYz5jGqqaGy0HdejeQsAS T9775ZVvUT9cqkLN68qYheIF/T0mOojgiuzx51MjXQuLcfC0GXALGdBTO8A9dLhd+NuO 1dhg==',
                    'd': 'gmail.com'
                },
                'value': 'v=1'
            },
            'x-google-smtp-source': 'AFSGD/V7mtz+v3srnzhQPsvX780lQFjstGA376orMHEOgtkEt1lTNbJuM1Z5iFykyIRJ2WTUgv9fu8vpYAIgE5s0Obo=',
            'received-spf': 'pass client-ip=209.85.221.51; envelope-from=test@example.com; helo=mail-wr1-f51.google.com',
            'x-gm-message-state': 'AA+aEWYWFNWZwcARJNJcTi6uF5Q4Kpo6ci42ilzfrF/XTRtGefxjTrxw 9Ee5ZsIQYMJoVWABnqG4bOyq0XWwm3M9jjBTB3eCDw==',
            // tslint:disable-next-line:max-line-length
            'x-google-dkim-signature': 'v=1; a=rsa-sha256; c=relaxed/relaxed; d=1e100.net; s=20161025; h=x-gm-message-state:mime-version:from:date:message-id:subject:to; bh=a7Ao6kN1QFn9ZmQ9B511W/QMfksdW72vy7yNkqOKuFI=; b=AeIzO0magI4eD/N0qZ9M9onrzyBTpzbqjVR8ybNxJyfUz6dRXFvanAHn7dBsF8SUgB DpJh3+bePKyHpHtQyY5UDmbhhEZ9yUJcykBBJDoYXSmEu74pwUB7cqhUimRzFZgVDnxq fhMSUu/KVjPPjAzEBuT8qZjDGazLhMLDov52PncC3D6/NK80OMIQh0sqh97Vd3PkKE0W 0huFdmR4EWah+DgmAVshyTYyx2JiCIG+0yz9utTaME2ofqNcodltypeKVbItygkNNlq1 VLKZMHdk7nL/i16DQKHuJBNGkN9qOsgLcyiFKkz0usX5uvKiflwRxY5IXjHtn1e6ZmN1 2b1w==',
            'x-dspam-probability': '0.0000',
            'message-id': '<CAC4QqpM34hdrawD3+LZnUqgsJ+96GPCFoz3dZKWC_ZRZPsT7mw@mail.gmail.com>',
            'subject': 'Testing session timeout',
            'to': {
                // tslint:disable-next-line:max-line-length
                'html': '<span class="mp_address_group"><a href="mailto:test@runbox.com" class="mp_address_email">test@runbox.com</a></span>',
                'value': [
                    {
                        'name': '',
                        'address': 'test@runbox.com'
                    }
                ],
                'text': 'test@runbox.com'
            },
            'mime-version': '1.0',
            // tslint:disable-next-line:max-line-length
            'x-spam-report': '*  0.0 FREEMAIL_FROM Sender email is commonly abused enduser mail provider *      (test[at]example.com) * -0.0 SPF_PASS SPF: sender matches SPF record *  0.0 HTML_MESSAGE BODY: HTML included in message * -0.1 DKIM_VALID_AU Message has a valid DKIM or DK signature from author\'s *       domain *  0.1 DKIM_SIGNED Message has a DKIM or DK signature, not necessarily *      valid * -0.1 DKIM_VALID Message has at least one valid DKIM or DK signature *  0.0 TVD_SPACE_RATIO No description available.',
            'content-type': {
                'value': 'multipart/alternative',
                'params': {
                    'boundary': '000000000000cd4db2057b8f2c13'
                }
            },
            'x-received': 'by 2002:adf:9061:: with SMTP id h88mr5026307wrh.65.1543229745743; Mon, 26 Nov 2018 02:55:45 -0800 (PST)',
            'return-path': {
                // tslint:disable-next-line:max-line-length
                'html': '<span class="mp_address_group"><a href="mailto:test@example.com" class="mp_address_email">test@example.com</a></span>',
                'value': [
                    {
                        'name': '',
                        'address': '@gmail.com'
                    }
                ],
                'text': 'test@example.com'
            },
            'received': [
                // tslint:disable-next-line:max-line-length
                'from [10.9.9.211] (helo=mailfront11.runbox.com) by delivery04.runbox with esmtp  (Exim 4.86_2) id 1gREYe-0006yc-Tv for test@runbox.com; Mon, 26 Nov 2018 11:56:04 +0100',
                // tslint:disable-next-line:max-line-length
                'from exim by mailfront11.runbox.com with dspam-scanned  (Exim 4.82) id 1gREYe-0007pI-Ok for test@runbox.com; Mon, 26 Nov 2018 11:56:04 +0100',
                // tslint:disable-next-line:max-line-length
                'from exim by mailfront11.runbox.com with sa-scanned  (Exim 4.82) id 1gREYe-0007p9-IA for test@runbox.com; Mon, 26 Nov 2018 11:56:04 +0100',
                // tslint:disable-next-line:max-line-length
                'from mail-wr1-f51.google.com ([209.85.221.51]) by mailfront11.runbox.com with esmtps  (TLS1.2:RSA_AES_128_CBC_SHA1:128) (Exim 4.82) id 1gREYM-0007eh-P9 for test@runbox.com; Mon, 26 Nov 2018 11:55:47 +0100',
                'by mail-wr1-f51.google.com with SMTP id p4so18377446wrt.7 for <test@runbox.com>; Mon, 26 Nov 2018 02:55:46 -0800 (PST)'
            ],
            'date': '2018-11-26T10:55:34.000Z',
            'x-filter-dspam': 'by mailfront11.runbox.com',
            'from': {
                // tslint:disable-next-line:max-line-length
                'html': '<span class="mp_address_group"><span class="mp_address_name">Test Person</span> &lt;<a href="mailto:test@example.com" class="mp_address_email">test@example.com</a>&gt;</span>',
                'value': [
                    {
                        'address': 'test@example.com',
                        'name': 'Test Person'
                    }
                ],
                'text': 'Test Person <test@example.com>'
            },
            // tslint:disable-next-line:max-line-length
            'x-dspam-factors': '27, Received-SPF*com, 0.00010, Received-SPF*com, 0.00010, Content-Type*charset, 0.00010, Content-Type*charset, 0.00010, Content-Type*multipart+alternative, 0.00010, Received-SPF*com+helo, 0.00010, X-Spam-Report*included+in, 0.00010, X-Spam-Report*HTML+included, 0.00010, X-Spam-Report*record+HTML, 0.00010, X-Spam-Report*SPF+record, 0.00010, Content-Type*text+html, 0.00010, To*test+runbox, 0.00010, Content-Type*html+charset, 0.00010, X-Spam-Report*sender+matches, 0.00010, X-Spam-Report*matches+SPF, 0.00010, To*runbox+com, 0.00010, X-Spam-Report*in+message, 0.00010, X-FILTER-DSPAM*by+mailfront11, 0.00010, DKIM-Signature*sha256+relaxed, 0.00010, Content-Type*alternative+boundary, 0.00010, Content-Type*plain+charset, 0.00010, X-FILTER-DSPAM*mailfront11+runbox, 0.00010, Received-SPF*helo+mail, 0.00010, Content-Type*text+plain, 0.00010, Content-Type*multipart, 0.00010, Content-Type*alternative, 0.00010, DKIM-Signature*subject, 0.00010'
        },
        'has_sent_mail_to': 0,
        'folderId': 143
    }
};
