// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2022 Runbox Solutions AS (runbox.com).
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
import { HttpClient } from '@angular/common/http';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { FolderListEntry } from '../common/folderlistentry';
import { MessageInfo } from '../common/messageinfo';
import { MailAddressInfo } from '../common/mailaddressinfo';
import { MessageListService } from '../rmmapi/messagelist.service';
import { MessageTableRowTool} from '../messagetable/messagetablerow';
import { Identity, ProfileService } from '../profiles/profile.service';
import { from, of, BehaviorSubject } from 'rxjs';
import { map, mergeMap, bufferCount, take, distinctUntilChanged } from 'rxjs/operators';

import moment from 'moment';
import 'moment-timezone';
import { objectEqualWithKeys } from '../common/util';

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
    reply_to: string = null;
    subject: string = null;
    msg_body = '';
    html = '';
    preview: string;
    in_reply_to: string;
    reply_to_id: string = null;
    replying = false;
    tags: string;
    useHTML = false;
    save = 'Save';
    attachments: any[];
    message_date = null;

    public static create(draftId: number,
                         fromAddress: Identity,
                         to: string, subject: string,
                         preview?: string,
                         message_date?: Date): DraftFormModel {
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

    public static reply(mailObj, froms: Identity[], all: boolean, useHTML: boolean): DraftFormModel {
        const ret = new DraftFormModel();
        ret.reply_to_id = mailObj.mid;
        ret.in_reply_to = mailObj.headers['message-id'];
        ret.replying = true;

        // list of MailAddressInfo objects:
        // sender always used for body string
        const sender: MailAddressInfo[] = mailObj.from.map((addr) => {
            return new MailAddressInfo(addr.name, addr.address);
        });

        // Reply to either the sender or the reply-to header:
        if (mailObj.headers['reply-to']) {
            const replies = mailObj.headers['reply-to'].value;
            ret.to = replies.map((addr) => new MailAddressInfo(addr.name, addr.address));
        } else {
            ret.to = sender;
        }

        // If all, also add all the other To/CC folks:
        // Guard: sometimes mailObj.to is not an array!?
        if (all && mailObj.to && Array.isArray(mailObj.to)) {
            ret.to = ret.to.concat(mailObj.to
                .filter((addr) =>
                    froms.find(fromObj => fromObj.email === addr.address) ? false : true
                       )
                .map((addr) => {
                    return new MailAddressInfo(addr.name, addr.address);
                })
                                  );
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

        const localTZ = moment.tz.guess();
        const replyHeaderHTML = 'On '
            + moment(mailObj.date, localTZ).format('yyyy-MM-DD HH:mm Z')
            + ' ' + moment.tz(localTZ).format('z') 
            + ', '
            + (mailObj.from[0].name
                ? `"${mailObj.from[0].name}" &lt;${mailObj.from[0].address}&gt; wrote:`
                : `${mailObj.from[0].address} wrote:`);

        if (!useHTML && mailObj.rawtext) {
            var replyHeaderText = replyHeaderHTML.replaceAll('&lt;', '<');
            replyHeaderText = replyHeaderText.replaceAll('&gt;', '>');
            ret.msg_body = '\n' + replyHeaderText + '\n'
          + mailObj.rawtext.split('\n').map((line) => line.indexOf('>') === 0 ? '>' + line : '> ' + line).join('\n');
        } else if (!useHTML && !mailObj.rawtext) {
            ret.msg_body = '';
        } else {
            ret.html =
                `<br /><div style="padding-left: 10px; border-left: black solid 1px">
                    <hr style="width: 100%" />
                    ${replyHeaderHTML}<br />
                    ${mailObj.sanitized_html}
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

    public static forward(mailObj, froms: Identity[], useHTML: boolean): DraftFormModel {
        const ret = new DraftFormModel();
        ret.setFromForResponse(mailObj, froms);

        const fwdFromNameStr = mailObj.from[0].name
            ? `"${mailObj.from[0].name}" &lt;${mailObj.from[0].address}&gt;`
            : `${mailObj.from[0].address}`;
        const localTZ = moment.tz.guess();
        const fwdDateStr = moment(mailObj.date, localTZ).local().format('yyyy-MM-DD HH:mm Z ') + moment.tz(localTZ).format('z');
        const fwdSubjectStr = `Subject: ${mailObj.subject}`;
        const fwdTo = mailObj.to ? mailObj.to.map((to) => `"${to.name}" &lt;${to.address}&gt;`) : [];
        const fwdCC = mailObj.cc ? mailObj.cc.map((cc) => `"${cc.name}" &lt;${cc.address}&gt;`) : [];
        const fwdHeaderHTML = `From: ${fwdFromNameStr} <br />
Time: ${fwdDateStr} <br />
${fwdSubjectStr} <br />`
            + (fwdTo.length > 0 ? `
<span>To: <span>` + fwdTo.join('</span><span>') + '</span></span> <br />' : '')
            + (fwdCC.length > 0 ? `
<span>CC: <span>` + fwdCC.join('</span><span>') + '</span></span> <br />' : '');
        ret.setSubjectForResponse(mailObj, 'Fwd: ');
        if (!useHTML) {
            var fwdHeaderText = fwdHeaderHTML.replaceAll(' <br />', '');
            var fwdHeaderText = fwdHeaderText.replaceAll(/<\/?span>/g, '');
            var fwdHeaderText = fwdHeaderText.replaceAll('&lt;', '<');
            var fwdHeaderText = fwdHeaderText.replaceAll('&gt;', '>');
            ret.msg_body = '\n\n----------------------------------------------\nForwarded message:\n' +
                fwdHeaderText + '\n\n\n' + mailObj.rawtext;
        } else {
            ret.html =
                `<br />
<hr style="width: 100%" />
---------- Forwarded message ----------<br />
${fwdHeaderHTML}<br />
${mailObj.sanitized_html}`;
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

    private setFromForResponse(mailObj, froms: Identity[]): void {
        if (froms.length > 0) {
            this.from = (
                [].concat(mailObj.to || []).concat(mailObj.cc || []).find(
                    addr => froms.find(fromObj => fromObj.email === addr.address.toLowerCase())
                ) || { address: froms[0].email }
            ).address.toLowerCase();
        } else {
            console.error('DraftDesk: No froms passed to setFromForResponse');
        }
    }

    private setSubjectForResponse(mailObj, prefix): void {
        this.subject = prefix + MessageInfo.getSubjectWithoutAbbreviation(mailObj.subject);
    }
}

@Injectable()
export class DraftDeskService {
    draftModels: BehaviorSubject<DraftFormModel[]> = new BehaviorSubject([]);
    fromsSubject: BehaviorSubject<Identity[]> = new BehaviorSubject([]);
    isEditing = -1;
    composingNewDraft: DraftFormModel;
    shouldReturnToPreviousPage = false;

    constructor(public rmmapi: RunboxWebmailAPI,
                private messagelistservice: MessageListService,
                private profileService: ProfileService,
                private http: HttpClient
               ) {
        this.profileService.validProfiles.subscribe((profiles) => {
            this.fromsSubject.next(profiles);
        });

        // Recreate drafts when froms(identities) change
        this.fromsSubject
            .subscribe(froms => {
                if (froms.length > 0) {
                    this.refreshDrafts();
                }
            });

        this.messagelistservice.refreshFolderList();
        this.messagelistservice.folderListSubject
            .pipe(distinctUntilChanged((prev: FolderListEntry[], curr: FolderListEntry[]) => {
                return prev.length === curr.length
                    && prev.every((f, index) =>
                        objectEqualWithKeys(f, curr[index], [
                            'folderId', 'totalMessages', 'newMessages'
                        ]))
            }))
            .subscribe((folders) => {
                this.refreshDrafts();
            });
    }

    // default identity for creating an email
    public mainIdentity(): Identity {
        return this.profileService.composeProfile;
    }

    private refreshDrafts() {
        if (this.fromsSubject.value.length > 0) {
            this.rmmapi.listAllMessages(0, 0, 0, 100, true, 'Drafts')
                .pipe(distinctUntilChanged((prev: any[], curr: any[]) => {
                    return prev.length === curr.length
                        && prev.every((m, index) =>
                            m.id === curr[index].id);
                }))
                .subscribe(messages => {
                    // need to keep any in-progress drafts!
                    const newDrafts = [];
                    messages.map((msgInfo) =>
                        newDrafts.push(
                            DraftFormModel.create(
                                msgInfo.id,
                                this.mainIdentity(),
                                msgInfo.to.map((addr) => addr.name === null || addr.address.indexOf(addr.name + '@') === 0 ?
                                    addr.address : addr.name + '<' + addr.address + '>').join(','),
                                msgInfo.subject, null, msgInfo.messageDate)
                        )
                                );
                    if (this.composingNewDraft) {
                        newDrafts.splice(0, 0, this.composingNewDraft);
                    }
                    this.draftModels.next(newDrafts);
                });
        }
    }

    public deleteDraft(messageId: number) {
        let models = this.draftModels.value;
        models = models.filter(dm => dm.mid !== messageId);
        this.draftModels.next(models);
    }

    public async newBugReport(
        local_search: boolean,
        keep_pane: boolean,
        content_preview: boolean,
        mailviewer_right: boolean,
        unread_only: boolean,
        on_mobile: boolean
    ) {
        const draftObj = DraftFormModel.create(
            -1,
            this.mainIdentity(),
            '"Runbox 7 Bug Reports" <bugs@runbox.com>',
            'Runbox 7 Bug Report'
        );
        const template = await this.http.get('assets/templates/bug_report.txt',
                                             {responseType: 'text'}).toPromise();
        const me = await this.rmmapi.me.toPromise();

        let body = `${template}`
        ;
        body = body.replace('%%USERNAME%%', me.username);
        body = body.replace('%%USERAGENT%%', window.navigator.userAgent);
        body = body.replace('%%INDEXSYNC%%', local_search ? 'Yes' : 'No');
        body = body.replace('%%VENDOR%%', window.navigator.vendor);
        body = body.replace('%%APPNAME%%', window.navigator.hasOwnProperty('appName')
            ? window.navigator.appName : '');
        body = body.replace('%%APPVERSION%%', window.navigator.hasOwnProperty('appVersion')
            ? window.navigator.appVersion : '');
        body = body.replace('%%PLATFORM%%', window.navigator.hasOwnProperty('appPlatform')
            ? window.navigator['appPlatform'] : '');
        body = body.replace('%%SIZE%%', window.outerWidth + 'x' + window.outerHeight);
        body = body.replace('%%SETTINGPANE%%', keep_pane ? 'Yes' : 'No');
        body = body.replace('%%SETTINGPREVIEW%%', content_preview ? 'Yes' : 'No');
        body = body.replace('%%SETTINGVIEWRRIGHT%%', mailviewer_right ? 'Yes' : 'No');
        body = body.replace('%%SETTINGUNREAD%%', unread_only ? 'Yes' : 'No');
        body = body.replace('%%ONMOBILE%%', on_mobile ? 'Mobile Browser' : '');

        draftObj.msg_body = body;

        await this.newDraft(draftObj);
    }

    public async newVideoCallInvite(to: string, url: URL) {
        const template = await this.http.get('assets/templates/video_call.txt',
                                             {responseType: 'text'}).toPromise();
        const draftObj = DraftFormModel.create(
            -1,
            this.mainIdentity(),
            to,
            "Let's have a video call"
        );
        draftObj.msg_body = template.replace('%%URL%%', url.toString());

        await this.newDraft(draftObj);
    }

    public newDraft(model: DraftFormModel): Promise<void> {
        return new Promise((resolve, _) => {
            const afterPrepare = () => {
                if (model.attachments && model.attachments.length > 0 ) {
                    model.attachments.forEach((att) =>
                        att.sizeDisplay = MessageTableRowTool.formatBytes(att.size, 2));
                }
                this.composingNewDraft = model;
                // const drafts = this.draftModels.value;
                // drafts.splice(0, 0, this.composingNewDraft);
                // this.draftModels.next(drafts);
                this.shouldReturnToPreviousPage = true;
                this.refreshDrafts();
                setTimeout(() => resolve(), 0);
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
        });
    }
}
