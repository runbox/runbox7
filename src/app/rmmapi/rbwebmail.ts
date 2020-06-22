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

import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { Observable ,  of, from ,  Subject ,  AsyncSubject } from 'rxjs';
import { share } from 'rxjs/operators';
import { MessageInfo, MailAddressInfo } from '../xapian/messageinfo';

import { Contact } from '../contacts-app/contact';
import { RunboxCalendar } from '../calendar-app/runbox-calendar';
import { RunboxCalendarEvent } from '../calendar-app/runbox-calendar-event';
import { Product } from '../account-app/product';
import { DraftFormModel } from '../compose/draftdesk.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, map, mergeMap, tap, bufferCount } from 'rxjs/operators';

import { ProgressDialog } from '../dialog/dialog.module';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { RunboxLocale } from '../rmmapi/rblocale';
import { ProgressSnackbarComponent } from '../dialog/progresssnackbar.component';
import { Profile } from '../profiles/profile';
import { RMM } from '../rmm';
import { FromAddress } from './from_address';

export class MessageFields {
    id: number;
    subject: string;
    size: number;
    seen_flag: number;
    flagged_flag: number;
    answered_flag: number;
    folder_id: number;
    from: string;
    to: string;
}

export class FolderListEntry {
    isExpandable?: boolean;
    priority?: number; // for sorting order

    constructor(
        public folderId: number,
        public newMessages: number,
        public totalMessages: number,
        public folderType: string,
        public folderName: string,
        public folderPath: string,
        public folderLevel: number) {
        this.folderPath = folderPath.replace(/\./g, '/');
    }
}

export class Alias {
    constructor(
        public id: number,
        public localpart: string,
        public name: string,
        public email: string
    ) { }
}

export class ContactSyncResult {
    constructor(
        public newSyncToken: string,
        public added:        Contact[],
        public removed:      string[],
        public toMigrate:    number,
    ) { }
}

class FromAddressResponse {
    public from_addresses: FromAddress[];
    public status: string;
}

export class RunboxMe {
    public uid: number;
    public username: string;

    public first_name: string;
    public last_name: string;

    public user_address: string;
    public single_domain: string;
    public disk_used: number;
    public localpart: string;

    public timezone: string;
    public currency: string;

    public subscription: number;
    public is_trial: boolean;
    public uses_own_domain: boolean;
}

export class MessageTextpart {
    type: string;
    textAsHtml: string;
    text: string;
}

export class MessageTextContents {
    text: string;
    html: string;
    textAsHtml: string;
}

export class MessageContents {
    text: MessageTextContents;
}

export class MessageFlagChange {
    /**
     * @param id message id
     * @param seenFlag seen flag - set to null if N/A
     * @param flaggedFlag flagged flag - set to null if N/A
     */
    constructor(
        public id: number,
        public seenFlag: boolean,
        public flaggedFlag: boolean
    ) {

    }
}

@Injectable()
export class RunboxWebmailAPI {

    public static readonly LIST_ALL_MESSAGES_CHUNK_SIZE: number = 10000;

    public messageFlagChangeSubject: Subject<MessageFlagChange> = new Subject();
    public me: AsyncSubject<RunboxMe> = new AsyncSubject();
    public rblocale: any;

    public last_on_interval;

    messageContentsCache: { [messageId: number]: Observable<MessageContents> } = {};

    constructor(
        public snackBar: MatSnackBar,
        private http: HttpClient,
        private dialog: MatDialog,
        public rmm: RMM,
        private ngZone: NgZone
    ) {
        this.rblocale = new RunboxLocale();
        this.http.get('/rest/v1/me')
            .pipe(
                map((res: any) => res.result),
                map((res: any) => {
                    res.uid = parseInt(res.uid, 10);
                    res.disk_used = res.quotas ? parseInt(res.quotas.disk_used, 10) : null;
                    return res;
                })
            ).subscribe((me: RunboxMe) => {
                this.me.next(me);
                this.me.complete();

                this.ngZone.runOutsideAngular(() =>
                    this.last_on_interval = setInterval(() => this.ngZone.run(() => {
                        this.updateLastOn().subscribe();
                    }), 5 * 60 * 1000)
                );

                this.updateLastOn().subscribe();
            });
    }

    public deleteCachedMessageContents(messageId: number) {
        if (this.messageContentsCache[messageId]) {
            delete this.messageContentsCache[messageId];
        }
    }

    public getMessageContents(messageId: number, refresh = false): Observable<MessageContents> {
        if (!refresh && this.messageContentsCache[messageId]) {
            return this.messageContentsCache[messageId];
        } else {
            const messageContentsObservable = new AsyncSubject<MessageContents>();

            this.messageContentsCache[messageId] = messageContentsObservable;

            this.http.get('/rest/v1/email/' + messageId)
            .pipe(
                map((r: any) => r.result),
            ).subscribe((r) => {
                messageContentsObservable.next(r);
                messageContentsObservable.complete();
            }, err => {
                delete this.messageContentsCache[messageId];
                messageContentsObservable.error(err);
            });

            return messageContentsObservable;
        }
    }

    public updateLastOn(): Observable<any> {
        return this.http.put('/rest/v1/last_on', {});
    }

    public deleteFromMessageContentsCache(messageId: number) {
        delete this.messageContentsCache[messageId];
    }

    public listDeletedMessagesSince(sincechangeddate: Date): Observable<number[]> {
        const datestring = sincechangeddate.toJSON().replace('T', ' ').substr(0, 'yyyy-MM-dd HH:mm:ss'.length);
        const url = `/rest/v1/list/deleted_messages/${datestring}`;

        return this.http.get(url).pipe(
            map((r: any) => (r.message_ids as number[]))
        );
    }

    public listAllMessages(page: number,
        sinceid: number = 0,
        sincechangeddate: number = 0,
        pagesize: number = RunboxWebmailAPI.LIST_ALL_MESSAGES_CHUNK_SIZE,
        skipContent: boolean = false,
        folder?: string)
        : Observable<MessageInfo[]> {
        // TODO: Need a JSON based REST api endpoint for this
        const url = '/mail/download_xapian_index?listallmessages=1' +
                    '&page=' + page +
                    '&sinceid=' + sinceid +
                    '&sincechangeddate=' + Math.floor(sincechangeddate / 1000) +
                    '&pagesize=' + pagesize + (skipContent ? '&skipcontent=1' : '') +
                    (folder ? '&folder=' + folder.replace(/\//g, '.') : '') +
                    '&avoidcacheuniqueparam=' + new Date().getTime();

        return this.http.get(url, { responseType: 'text' }).pipe(
            map((txt: string) => txt.length > 0 ? txt.split('\n') : []),
            map((lines: string[]) =>
                lines.map((line) => {
                    const parts = line.split('\t');
                    const from_ = parts[7];
                    const to = parts[8];
                    const fromInfo: MailAddressInfo[] = MailAddressInfo.parse(from_);
                    const toInfo: MailAddressInfo[] = MailAddressInfo.parse(to);
                    const size: number = parseInt(parts[10], 10);
                    const attachment: boolean = parts[11] === 'y';
                    const seenFlag: boolean = parseInt(parts[4], 10) === 1;
                    const answeredFlag: boolean = parseInt(parts[5], 10) === 1;
                    const flaggedFlag: boolean = parseInt(parts[6], 10) === 1;


                    const ret = new MessageInfo(
                        parseInt(parts[0], 10), // id
                        new Date(parseInt(parts[1], 10) * 1000), // changed date
                        new Date(parseInt(parts[2], 10) * 1000), // message date
                        parts[3],                                // folder
                        seenFlag,                                // seen flag
                        answeredFlag,                            // answered flag
                        flaggedFlag,                             // flagged flag
                        fromInfo,                                // from
                        toInfo,                                  // to
                        [],                                      // cc
                        [],                                      // bcc
                        parts[9],                                // subject
                        parts[12],                               // plaintext body
                        size,                                    // size
                        attachment                               // attachment
                    );
                    if (size === -1) {
                        // Size = -1 means deleted flag is set - ref hack in Webmail.pm
                        ret.deletedFlag = true;
                    }
                    return ret;
                })
            )
        );
    }

    subscribeShowBackendErrors(req: any) {
        req.subscribe((res: any) => {
            if (res.status === 'error') {
                if (res.errors && res.errors.length) {
                    const error_msg = res.errors.map((key) => {
                        return this.rblocale.translate(key).replace('_', ' ');
                    }).join('. ');
                    const error_formatted = error_msg.charAt(0).toUpperCase() + error_msg.slice(1);
                    this.snackBar.open(error_formatted, 'Dismiss');
                } else {
                    this.snackBar.open('There was an unknown error and this action cannot be completed.', 'Dismiss');
                }
            }
        });
    }

    createFolder(parentFolderId: number, newFolderName: string): Observable<boolean> {
        const req = this.http.post('/rest/v1/email_folder/create', {
            'new_folder': newFolderName,
            'to_folder': parentFolderId
        }).pipe(share());
        this.subscribeShowBackendErrors(req);
        return req.pipe(map((res: any) => res.status === 'success'));
    }

    renameFolder(folderId: number, newFolderName: string): Observable<boolean> {
        const req = this.http.put('/rest/v1/email_folder/rename', {
            'new_folder': newFolderName,
            'folder_id': folderId
        }).pipe(share());
        this.subscribeShowBackendErrors(req);
        return req.pipe(map((res: any) => res.status === 'success'));
    }

    moveFolder(folderId: number, newParentFolderId: number, ordered_ids?: number[]): Observable<boolean> {
        const requestBody: any = {
                'to_folder': newParentFolderId,
                'folder_id': folderId
            };

        if (ordered_ids) {
            requestBody.ordered_ids = ordered_ids;
        }

        const req = this.http.put('/rest/v1/email_folder/move', requestBody).pipe(share());
        this.subscribeShowBackendErrors(req);
        return req.pipe(map((res: any) => res.status === 'success'));
    }

    deleteFolder(folderid: number): Observable<boolean> {
        const req = this.http.delete(`/rest/v1/email_folder/delete/${folderid}`).pipe(share());
        this.subscribeShowBackendErrors(req);
        return req.pipe(map((res: any) => res.status === 'success'));
    }

    getFolderList(): Observable<Array<FolderListEntry>> {
        let folderLevel = 0;
        let depth = 0;
        const flattenFolders = folders => {
            folderLevel++;
            const flattenedFolders = folders.map(folder => {
                const folderListEntry = new FolderListEntry(
                    parseInt(folder.id, 10),
                    folder.msg_new,
                    folder.total,
                    folder.type,
                    folder.name,
                    folder.folder,
                    folderLevel - 1
                );
                folderListEntry.priority = folder.priority;

                return folder.subfolders.length > 0 ?
                    [folderListEntry].concat(flattenFolders(folder.subfolders)) : folderListEntry;

            });
            if (folderLevel > depth) {
                depth = folderLevel;
            }
            folderLevel--;
            return flattenedFolders;
        };
        return this.http.get('/rest/v1/email_folder/list').pipe(
            map((response: any) =>
                flattenFolders(response.result.folders)
                .flat(depth)
            )
        );
    }

    public moveToFolder(messageIds: number[], folderId: number): Observable<any> {
        return this.http.post('/rest/v1/email/move', { messages: messageIds, folder_id: folderId });
    }

    public trainSpam(params): Observable<any> {
        return this.http.post('/rest/v1/spam/', JSON.stringify(params));
    }

    public trashMessages(messageIds: number[]): Observable<any> {
        const ids = messageIds.join(',');
        return this.http.delete(`/rest/v1/email/${ids}`);
    }

    public markSeen(messageId: any, seen_flag_value = 1): Observable<any> {
        return of(null).pipe(
            tap(() => this.messageFlagChangeSubject.next(
                new MessageFlagChange(messageId, seen_flag_value === 1 ? true : false, null)
            )),
            mergeMap(() => this.http.put('/rest/v1/email/' + messageId, JSON.stringify({ seen_flag: seen_flag_value }))
        ));
    }

    public markFlagged(messageId: any, flagged_flag_value = 1): Observable<any> {
        return of(null)
            .pipe(
                tap((msgInfo) => this.messageFlagChangeSubject.next(
                    new MessageFlagChange(messageId, null, flagged_flag_value === 1 ? true : false)
                )),
                mergeMap(() => this.http.put('/rest/v1/email/' + messageId, JSON.stringify({ flagged_flag: flagged_flag_value })))
            );
    }

    private postForm(params): Observable<any> {
        return this.http.post('/ajax', params, { responseType: 'text' });
    }

    public getMessageFields(messageId: number): Observable<MessageFields> {
        return this.http.get(`/rest/v1/email/${messageId}/fields`).pipe(
            map((res: any) => res.result as MessageFields));
    }

    public getFromAddress(): Observable<FromAddress[]> {
        return this.rmm.profile.load_verified().pipe(
            map((http_res) => {
            const res = http_res;
                const results = [];
                Object.keys(res['result']).forEach( (k) => {
                    res['result'][k].forEach( (item) => {
                        const profile = FromAddress.fromObject({
                            id: item.profile.id,
                            email: item.profile.email,
                            reply_to: item.profile.reply_to,
                            name: item.profile.from_name,
                            signature: item.profile.signature,
                        });
                        results.push(profile);
                    });
                });
                return results;
            })
        );
    }

    public getDefaultProfile(): Observable<FromAddress> {
        return this.http.get('/rest/v1/me/defaultprofile').pipe(
            map((res: any) =>
                res.result
            ));
    }

    public getAliases(): Observable<Alias[]> {
        return this.http.get('/ajax/aliases')
            .pipe(
                map((res: any) => res.aliases),
                map((aliases: any[]) =>
                    aliases.map((alias) => new Alias(alias.id,
                        alias.localpart,
                        alias.name,
                        alias.localpart + '@' + alias.name))
                )
            );
    }

    public copyAttachmentToDraft(messageId: string, attachmentIndex: number): Observable<any> {
        return this.http.put(
            `/rest/v1/email/${messageId}/copyattachmenttodraft/${attachmentIndex}`,
            {}
        );
    }

    public saveDraft(draftModel: DraftFormModel, send?: boolean): Observable<any> {
        return this.me.pipe(mergeMap((me) => {
            const params = new FormData();
            params.append('action', 'ajax_send_msg');
            params.append('username', me.username);
            params.append('mid', '' + draftModel.mid);
            params.append('msg_body', draftModel.msg_body);
            params.append('from', draftModel.from);
            params.append('to', draftModel.to.map((recipient) => recipient.nameAndAddress).join(','));
            if (draftModel.cc) {
                params.append('cc', draftModel.cc.map((recipient) => recipient.nameAndAddress).join(','));
            }
            if (draftModel.bcc) {
                params.append('bcc', draftModel.bcc.map((recipient) => recipient.nameAndAddress).join(','));
            }
            if (draftModel.subject) {
                params.append('subject', draftModel.subject);
            }
            if (draftModel.in_reply_to) {
                params.append('in_reply_to', draftModel.in_reply_to);
            }
            if (draftModel.reply_to_id) {
                params.append('reply_to_id', draftModel.reply_to_id);
            }
            if (draftModel.tags) {
                params.append('tags', draftModel.tags);
            }
            if (draftModel.useHTML) {
                params.append('ctype', 'html');
            }
            if (draftModel.attachments) {
                params.append('attachments',
                    draftModel.attachments
                        .filter((att) => att.file !== 'UTF-8Q')
                        .filter((att) => att.file)
                        .map((att) => att.file)
                        .join(','));
            }
            if (send) {
                params.append('send', 'Send');
            } else {
                params.append('save', 'Save');
            }
            // console.log(params);
            return this.postForm(params).pipe(map((res) => res.split('|')));
        }));
    }

    public getContactsSettings(): Observable<any> {
        return this.http.get<any>('/rest/v1/addresses_contact/settings').pipe(
            map((res: HttpResponse<any>) => res['result']),
        );
    }

    public addNewContact(c: Contact): Observable<string> {
        return this.http.put('/rest/v1/contacts/by_href/', {
            uuid: c.id,
            vcf: c.vcard()
        }).pipe(
            map((res: HttpResponse<any>) => res['result'])
        );
    }

    public modifyContact(c: Contact): Observable<Contact> {
        return this.http.post('/rest/v1/contacts/by_href/' + btoa(c.url), {
            href: c.url,
            vcf:  c.vcard(),
        }).pipe(
            map((res: HttpResponse<any>) => res['result'])
        );
    }

    public deleteContact(contact: Contact): Observable<any> {
        return this.http.delete('/rest/v1/contacts/by_href/' + btoa(contact.url)).pipe(
            map((res: HttpResponse<any>) => res)
        );
    }

    public syncContacts(syncToken?: string): Observable<ContactSyncResult> {
        const path = syncToken ? ('/' + btoa(syncToken)) : '';
        return this.http.get<any>('/rest/v1/contacts/sync' + path).pipe(
            map((res: HttpResponse<any>) => res['result']),
            map((result: any) => new ContactSyncResult(
                result.newToken,
                result.added.map((c: any) => Contact.fromVcard(c[0], c[1])),
                result.removed,
                result.to_migrate,
            )),
        );
    }

    public getCalendars(): Observable<RunboxCalendar[]> {
        return this.http.get('/rest/v1/calendar/calendars').pipe(
            map((res: HttpResponse<any>) => res['result']['calendars']),
            map((calendars: any[]) =>
                calendars.map((c) => new RunboxCalendar(c))
            )
        );
    }

    public addCalendar(e: RunboxCalendar): Observable<any> {
        return this.http.put('/rest/v1/calendar/calendars', e).pipe(
            map((res: HttpResponse<any>) => res['result'])
        );
    }

    public modifyCalendar(e: RunboxCalendar): Observable<any> {
        return this.http.post('/rest/v1/calendar/calendars', e).pipe(
            map((res: HttpResponse<any>) => res['result'])
        );
    }

    public deleteCalendar(id: string): Observable<any> {
        return this.http.delete('/rest/v1/calendar/calendars/' + id).pipe(
            map((res: HttpResponse<any>) => res)
        );
    }

    public getCalendarEvents(): Observable<any> {
        return this.http.get('/rest/v1/calendar/events_raw').pipe(
            map((res: HttpResponse<any>) => res['result']['events'])
        );
    }

    public addCalendarEvent(e: RunboxCalendarEvent): Observable<any> {
        const payload = {
            calendar: e.calendar,
            ical:     e.toIcal(),
        };
        return this.http.put('/rest/v1/calendar/events_raw', payload).pipe(
            map((res: HttpResponse<any>) => res['result'])
        );
    }

    public modifyCalendarEvent(e: RunboxCalendarEvent): Observable<any> {
        const payload = {
            id:       e.id,
            ical:     e.toIcal(),
        };
        return this.http.post('/rest/v1/calendar/events_raw', payload).pipe(
            map((res: HttpResponse<any>) => res)
        );
    }

    public deleteCalendarEvent(id: string|number): Observable<any> {
        return this.http.delete('/rest/v1/calendar/events/' + id).pipe(
            map((res: HttpResponse<any>) => res)
        );
    }

    public importCalendar(calendar_id: string, ical: string): Observable<any> {
        return this.http.put('/rest/v1/calendar/ics/' + calendar_id, { ical: ical }).pipe(
            map((res: HttpResponse<any>) => res['result'])
        );
    }

    public getAvailableProducts(): Observable<Product[]> {
        return this.http.get('/rest/v1/account_product/available').pipe(
            map((res: HttpResponse<any>) => res['result']['products']),
            map((products: any[]) => products.map((c) => new Product(c))),
        );
    }

    public orderProducts(products: any[], method: string, currency: string, domregHash?: string): Observable<any> {
        return this.http.post('/rest/v1/account_product/order', {
            products:    products,
            method:      method,
            currency:    currency,
            domreg_hash: domregHash,
        }).pipe(
            map((res: HttpResponse<any>) => res['result'])
        );
    }

    public getStripePubkey(): Observable<string> {
        return this.http.get('/rest/v1/account_product/stripe/pubkey').pipe(
            map((res: HttpResponse<any>) => res['result']['key'] as string)
        );
    }

    public payWithBitpay(tid: number, receipt_url: string): Observable<any> {
        return this.http.post('/rest/v1/account_product/bitpay/pay', {
            tid: tid, receipt_url: receipt_url
        }).pipe(
            map((res: HttpResponse<any>) => res['result'])
        );
    }

    public payWithPaypal(tid: number, return_url: string, cancel_url: string): Observable<any> {
        return this.http.post('/rest/v1/account_product/paypal/pay', {
            tid: tid, return_url: return_url, cancel_url: cancel_url
        }).pipe(
            map((res: HttpResponse<any>) => res['result'])
        );
    }

    public payWithStripe(tid: number, paymentMethod: string): Observable<any> {
        return this.http.post('/rest/v1/account_product/stripe/pay', {
            tid: tid, payment_method: paymentMethod
        }).pipe(
            map((res: HttpResponse<any>) => res['result'])
        );
    }

    public confirmPaypalPayment(paymentId: string, payerId: string): Observable<any> {
        return this.http.post('/rest/v1/account_product/paypal/confirm', {
            payment_id: paymentId, payer_id: payerId
        }).pipe(
            map((res: HttpResponse<any>) => res['result'])
        );
    }

    public confirmStripePayment(paymentId: string): Observable<any> {
        return this.http.post('/rest/v1/account_product/stripe/confirm', {
            payment_intent_id: paymentId
        }).pipe(
            map((res: HttpResponse<any>) => res['result'])
        );
    }

    public getActiveProducts(): Observable<any> {
        return this.http.get('/rest/v1/account_product/active').pipe(
            map((res: HttpResponse<any>) => res['result'])
        );
    }

    public getPaypalBillingAgreements(): Observable<any> {
        return this.http.get('/rest/v1/account_product/billing_agreement').pipe(
            map((res: HttpResponse<any>) => res['result'])
        );
    }

    public getPaypalBillingAgreementDetails(id: string): Observable<any> {
        return this.http.get('/rest/v1/account_product/billing_agreement/' + id).pipe(
            map((res: HttpResponse<any>) => res['result'])
        );
    }

    public cancelPaypalBillingAgreement(id: string): Observable<any> {
        return this.http.delete('/rest/v1/account_product/billing_agreement/' + id).pipe(
            map((res: HttpResponse<any>) => res['result'])
        );
    }

    public getCreditCards(): Observable<any> {
        return this.http.get('/rest/v1/account_product/payment_methods').pipe(
            map((res: HttpResponse<any>) => res['result'])
        );
    }

    public detachCreditCard(id: string): Observable<any> {
        return this.http.delete('/rest/v1/account_product/payment_methods/' + id);
    }

    public makeCardDefault(id: string): Observable<any> {
        return this.http.post('/rest/v1/account_product/default_payment_method/' + id, {});
    }

    public getProducts(pids: number[]): Observable<Product[]> {
        return this.http.get('/rest/v1/account_product/available', { params: { pids: pids.join(',') } }).pipe(
            map((res: HttpResponse<any>) => res['result']['products']),
            map((products: any[]) => products.map((c) => new Product(c))),
        );
    }

    public getReceipt(tid: number): Observable<any> {
        return this.http.get('/rest/v1/account_product/receipt/' + tid).pipe(
            map((res: HttpResponse<any>) => res['result'])
        );
    }

    public getTransactions(): Observable<any> {
        return this.http.get('/rest/v1/account_product/transactions').pipe(
            map((res: HttpResponse<any>) => res['result'])
        );
    }

    public setProductAutorenew(apid: number, active: boolean): Observable<any> {
        return this.http.post('/rest/v1/account_product/autorenew', {
            apid:   apid,
            active: active ? 1 : 0,
        }).pipe(
            map((res: HttpResponse<any>) => res)
        );
    }
}
