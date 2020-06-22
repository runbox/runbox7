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
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { FromAddress } from '../rmmapi/from_address';
import { MessageInfo, MailAddressInfo } from '../xapian/messageinfo';
import { Observable, from, of, AsyncSubject } from 'rxjs';
import { map, mergeMap, bufferCount, take } from 'rxjs/operators';
import {RMM} from '../rmm';

export class ForwardedAttachment {
    constructor(
        public messageId: string,
        public attachmentIndex: number,
        public contentId: string
    ) {

    }
}

export class DraftFormModel {
    static MAX_DRAFT_PREVIEW_LENGTH = 200;
    static newDraftCount = -1;

    from: string = null;
    mid: number = (DraftFormModel.newDraftCount--);
    to: MailAddressInfo[] = [];
    cc: MailAddressInfo[] = [];
    bcc: MailAddressInfo[] = [];
    subject: string = null;
    msg_body = '';
    preview: string;
    in_reply_to: string;
    reply_to_id: string = null;
    tags: string;
    useHTML = false;
    save = 'Save';
    attachments: any[];

    public static create(draftId: number, fromAddress: FromAddress, to: string, subject: string, preview?: string): DraftFormModel {
        const ret = new DraftFormModel();
        ret.from = fromAddress.email;
        ret.mid = draftId;
        ret.to = to ? MailAddressInfo.parse(to) : [];
        ret.subject = subject;
        if (preview) {
            // We create an element here because we want the plain text
            const previewElm = document.createElement('div');
            previewElm.innerHTML = preview;
            // And truncate it by MAX_DRAFT_PREVIEW_LENGTH chars
            ret.preview = DraftFormModel.trimmedPreview(previewElm.innerText.trim().replace(/\s+/g, ' '));
        }
        return ret;
    }

    public static reply(mailObj, froms: FromAddress[], all: boolean, useHTML: boolean): DraftFormModel {
        const ret = new DraftFormModel();
        ret.reply_to_id = mailObj.mid;
        ret.in_reply_to = mailObj.headers['message-id'];

        // list of MailAddressInfo objects:
        const sender: MailAddressInfo[] = mailObj.from.map((addr) => {
            return new MailAddressInfo(addr.name, addr.address);
        });
        ret.to = sender;

        if (mailObj.headers['reply-to']) {
            const addr = mailObj.headers['reply-to'].value;
            ret.to = [new MailAddressInfo(addr.name, addr.address)];
        }

        if (all) {
            ret.to = mailObj.from.concat(
                mailObj.to)
                .filter((addr) =>
                        froms.find(fromObj => fromObj.email === addr.address) ? false : true
                       )
                .map((addr) => {
                    return new MailAddressInfo(addr.name, addr.address);
                });
            if (mailObj.cc) {
                ret.cc = mailObj.cc
                    .filter((addr) => froms.find(fromObj => fromObj.email === addr.address) ? false : true)
                    .map((addr) => {
                        return new MailAddressInfo(addr.name, addr.address);
                    });
            }
        }
        ret.setFromForResponse(mailObj, froms);
        ret.setSubjectForResponse(mailObj, 'Re: ');

        let mailDate: Date = mailObj.date;
        const timezoneOffset: number = mailDate.getTimezoneOffset();

        mailDate = new Date(mailDate.getTime() - timezoneOffset * 60 * 1000);
        const timezoneOffsetString: string = 'GMT' + (timezoneOffset <= 0 ? '+' : '-') +
            ('' + (100 + (Math.abs(timezoneOffset) / 60))).substr(1, 2) + ':' +
            ('' + (100 + (Math.abs(timezoneOffset) % 60))).substr(1, 2);

        if (!useHTML && mailObj.rawtext) {
            ret.msg_body = '\n' + mailDate.toISOString().substr(0, 'yyyy-MM-ddTHH:mm'.length).replace('T', ' ') + ' ' +
                timezoneOffsetString + ' ' + sender[0].nameAndAddress + ':\n' +
                mailObj.rawtext.split('\n').map((line) => line.indexOf('>') === 0 ? '>' + line : '> ' + line).join('\n');
        } else if (!useHTML && !mailObj.rawtext) {
            ret.msg_body = '';
        } else {
            ret.msg_body =
                `<br /><div style="padding-left: 10px; border-left: black solid 1px">
                    <hr style="width: 100%" />
                    ${mailObj.origMailHeaderHTML}<br />
                    ${mailObj.html}
                </div>`;
            ret.useHTML = true;
        }
        return ret;
    }

    public static trimmedPreview(preview: string): string {
        let ret = preview.substring(0, DraftFormModel.MAX_DRAFT_PREVIEW_LENGTH);
        if (ret.length === DraftFormModel.MAX_DRAFT_PREVIEW_LENGTH) {
            ret += '...';
        }
        return ret;
    }

    public static forward(mailObj, froms: FromAddress[], useHTML: boolean): DraftFormModel {
        const ret = new DraftFormModel();
        ret.setFromForResponse(mailObj, froms);

        ret.setSubjectForResponse(mailObj, 'Fwd: ');
        if (!useHTML) {
            ret.msg_body = '\n\n----------------------------------------------\nForwarded message:\n' +
                mailObj.origMailHeaderText + '\n\n' + mailObj.rawtext;
        } else {
            ret.msg_body =
                `<br />
                <hr style="width: 100%" />
                Forwarded message:<br />
                ${mailObj.origMailHeaderHTML}<br />
                ${mailObj.html}`;
            ret.useHTML = true;
        }
        ret.attachments = mailObj.attachments.map((attachment, ndx) =>
            new ForwardedAttachment(mailObj.mid, ndx, attachment.cid)
        );
        return ret;
    }

    public isUnsaved(): boolean {
        if (this.mid <= -1) {
            return true;
        }
        return false;
    }

    private setFromForResponse(mailObj, froms: FromAddress[]): void {
        this.from = (
            [].concat(mailObj.to || []).concat(mailObj.cc || []).find(
                addr => froms.find(fromObj => fromObj.email === addr.address.toLowerCase())
            ) || { address: froms[0].email }
        ).address.toLowerCase();
    }

    private setSubjectForResponse(mailObj, prefix): void {
        this.subject = prefix + MessageInfo.getSubjectWithoutAbbreviation(mailObj.subject);
    }
}

@Injectable()
export class DraftDeskService {
    draftModels: DraftFormModel[] = [];
    draftsRefreshed: AsyncSubject<boolean> = new AsyncSubject();
    froms: FromAddress[] = [];

    constructor(
        public rmm: RMM,
        public rmmapi: RunboxWebmailAPI) {
            this.refreshDrafts()
                .subscribe(() => {
                    this.draftsRefreshed.next(true);
                    this.draftsRefreshed.complete();
                });
    }

    public refreshFroms(): Observable<FromAddress[]> {
        return this.rmm.profile.load_verified().pipe(
            map((reply) => {
                this.froms = this.rmm.profile.from_addresses;
                return this.froms;
            })
        );
    }

    private refreshDrafts(): Observable<DraftFormModel[]> {
        return this.refreshFroms().pipe(
            mergeMap(() => this.rmmapi.listAllMessages(0, 0, 0, 100, true, 'Drafts')),
            map((msgs) => {
                this.draftModels =
                    msgs.map((msgInfo) =>
                        DraftFormModel.create(msgInfo.id,
                            this.froms[0],
                            msgInfo.to.map((addr) => addr.name === null || addr.address.indexOf(addr.name + '@') === 0 ?
                                addr.address : addr.name + '<' + addr.address + '>').join(','),
                            msgInfo.subject, null)
                    );
            }),
            map(() => this.draftModels)
        );
    }

    public deleteDraft(messageId: number) {
        this.draftModels = this.draftModels
            .filter(dm => dm.mid !== messageId);
    }

    public newDraft(model: DraftFormModel, callback?: Function) {
        const afterPrepare = () => {
            this.draftModels.splice(0, 0, model);
            if (callback) {
                setTimeout(() => callback(), 0);
            }
        };
        if (model.attachments && model.attachments.length > 0 ) {
            from(model.attachments
                .map((att, ndx) => {
                    if (att instanceof ForwardedAttachment) {
                        return this.rmmapi.copyAttachmentToDraft(att.messageId, att.attachmentIndex)
                            .pipe(
                                map(ret => {
                                    ret.file = ret.filename;

                                    model.attachments[ndx] = ret;
                                    if (model.useHTML && att.contentId) {
                                        const draftUrl = `/ajax/download_draft_attachment?filename=${ret.filename}`;

                                        model.msg_body = model.msg_body.replace(`unsafe:cid:${att.contentId}`, draftUrl);
                                    }
                                    return true;
                                })
                            );
                    } else {
                        return of(true);
                    }
                })
            ).pipe(
                mergeMap(m => m.pipe(take(1)), 1),
                bufferCount(model.attachments.length)
            ).subscribe(() => {
                afterPrepare();
            });
        } else {
            afterPrepare();
        }
    }
}
