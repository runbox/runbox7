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
import { Observable, from, Subject, AsyncSubject, firstValueFrom } from 'rxjs';
import { share } from 'rxjs/operators';
import { MessageInfo } from '../common/messageinfo';
import { MailAddressInfo } from '../common/mailaddressinfo';
import { FolderListEntry } from '../common/folderlistentry';

import { Contact } from '../contacts-app/contact';
import { RunboxCalendar } from '../calendar-app/runbox-calendar';
import { RunboxCalendarEvent } from '../calendar-app/runbox-calendar-event';
import { Product } from '../account-app/product';
import { DraftFormModel } from '../compose/draftdesk.service';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { filter, map, mergeMap } from 'rxjs/operators';

import { HttpClient, HttpResponse } from '@angular/common/http';
import { RunboxLocale } from '../rmmapi/rblocale';
import { RMM } from '../rmm';
import { Identity, FromPriority } from '../profiles/profile.service';
import { MessageCache } from './messagecache';
import { LRUMessageCache } from './lru-message-cache';
import moment from 'moment';
import { SavedSearchStorage } from '../saved-searches/saved-searches.service';
import { PreferencesResult } from '../common/preferences.service';

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

export class RunboxMe {
    public uid: number;
    public username: string;
    public user_created: string;

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

    public account_status: string;

    public owner?: {
        uid: number;
        username: string;
    };

    constructor(instanceData?: RunboxMe) {
        if (instanceData) {
            this.deserialize(instanceData);
        }
    }

    private deserialize(instanceData: RunboxMe) {
        const keys = Object.keys(instanceData);

        for (const key of keys) {
            if (instanceData.hasOwnProperty(key)) {
                this[key] = instanceData[key];
            }
        }
    }

    getCreatedMoment(): moment.Moment {
        return moment(this.user_created, 'X');
    }
    newerThan(duration: number): boolean {
        const now = moment();
        return this.getCreatedMoment().diff(now) < duration;
    }
    isExpired(): boolean {
        return this.account_status === 'expired';
    }
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
    text?: MessageTextContents;
    version = 4;
    status: 'success';
    errors: [];
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

    private messageCache: AsyncSubject<MessageCache> = new AsyncSubject();
    private messageContentsRequestCache = new LRUMessageCache<Promise<MessageContents>>();

    constructor(
        private http: HttpClient,
        private ngZone: NgZone,
        private snackBar: MatSnackBar,
        public rmm: RMM,
    ) {
        this.rblocale = new RunboxLocale();

        this.me.subscribe(me => {
            this.messageCache.next(new MessageCache(me.uid));
            this.messageCache.complete();
        });       
    }

    public setRunboxMe(res:any) {
        res.uid = parseInt(res.uid, 10);
        res.disk_used = res.quotas ? parseInt(res.quotas.disk_used, 10) : null;
        const me = new RunboxMe(res);
        this.me.next(me);
        this.me.complete();

        if (!this.last_on_interval) {
            this.ngZone.runOutsideAngular(() =>
                this.last_on_interval = setInterval(() => this.ngZone.run(() => {
                    this.updateLastOn().subscribe();
                }), 5 * 60 * 1000)
            );
            this.updateLastOn().subscribe();
        }
    }

    public deleteCachedMessageContents(messageId: number) {
        this.messageCache.subscribe(cache => cache.delete(messageId));
        this.messageContentsRequestCache.delete(messageId);
    }

    public getCachedMessageContents(messageId: number): Promise<MessageContents> {
        let cached = this.messageContentsRequestCache.get(messageId);
        if (!cached) {
            // This kind of multilevel caching may seem excessive,
            // but it turns out that pulling a single row from indexedDB (or maybe from Dexie specifically?)
            // can easily take over 100ms: the difference between "instant" and "fast"
            // Since instant is the only acceptable result, we cache indexedDB lookups here.
            cached = firstValueFrom(this.messageCache)
                .then(cache => cache.get(messageId));
            this.messageContentsRequestCache.add(messageId, cached);
        }
        return cached;
    }

    public getMessageContents(messageId: number, refresh = false): Observable<MessageContents> {
        const cached = refresh ? Promise.resolve(null) : this.getCachedMessageContents(messageId);
        return from(cached.then(contents => {
            if (contents) {
                return contents;
            } else {
                const messagePromise = new Promise<MessageContents>((resolve, reject) => {
                    this.http.get('/rest/v1/email/' + messageId)
                        .subscribe(async (response) => {
                        const messageCache = await firstValueFrom(this.messageCache);
                        if (response['status'] === 'success') {
                            const msg = Object.assign( new MessageContents(), response['result']);
                            msg.status = response['status'];
                            messageCache.set(messageId, msg);
                            resolve(msg);
                        } else if (response['status'] === 'warning') {
                            // exists but we couldnt fetch it all
                            const msg = Object.assign( new MessageContents());
                            msg.status = response['status'];
                            msg.errors = response['errors'];
                            messageCache.set(messageId, msg);
                            resolve(msg);
                        } else {
                            // We load message data at unexpected times
                            // for the user, don't display a generic error yet
                            console.log('Error loading message ' + messageId);
                            console.log(response);
                            delete this.messageContentsRequestCache[messageId];
                            reject(response);
                        }
                    }, err => {
                        this.deleteCachedMessageContents(messageId);
                        reject(err);
                    });
                });
                this.messageContentsRequestCache.add(messageId, messagePromise);
                return messagePromise;
            }
        }));
    }

    public updateLastOn(): Observable<any> {
        return this.http.put('/rest/v1/last_on', {});
    }

    public listDeletedMessagesSince(sincechangeddate: Date): Observable<number[]> {
        const datestring = sincechangeddate.toJSON().replace('T', ' ').substr(0, 'yyyy-MM-dd HH:mm:ss'.length);
        const url = `/rest/v1/list/deleted_messages/${datestring}`;

        return this.http.get(url).pipe(
            map((r: any) => (r.message_ids as number[]))
        );
    }

  // FIXME: duplicated in restapi_standalone (no gui) for web worker
  // make there be no duplicates!
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
                    (folder ? '&folder=' + folder : '') +
                    '&avoidcacheuniqueparam=' + new Date().getTime();

            return this.me.pipe(
                filter(me => !me.isExpired()),
                mergeMap((me) => {
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
                })
            );
        }

    subscribeShowBackendErrors(req: any) {
        req.subscribe((res: any) => {
            this.showBackendErrors(res);
        });
    }

    showBackendErrors(res: any) {
        if (res.status === 'error' || res.status === 'warning') {
            console.log(res);
            if (res.errors && res.errors.length) {
                const error_msg = res.errors.map((key) => {
                    let loc = this.rblocale.translate(key).replace('_', ' ');
                    if (loc.length === 0) {
                        loc = key;
                    }
                    return loc;
                }).join('. ');
                const error_formatted = error_msg.charAt(0).toUpperCase() + error_msg.slice(1);
                this.snackBar.open(error_formatted, 'Dismiss');
            } else {
                this.snackBar.open('There was an unknown error and this action cannot be completed.', 'Dismiss');
            }
        }
    }

    createFolder(parentFolderId: number, newFolderName: string, order: number[]): Observable<boolean> {
        const req = this.http.post('/rest/v1/email_folder/create', {
            'new_folder': newFolderName,
            'to_folder': parentFolderId,
            'ordered_ids': order
        }).pipe(share());
        this.subscribeShowBackendErrors(req);
        return req.pipe(filter((res: any) => res.status === 'success'));
    }

    renameFolder(folderId: number, newFolderName: string): Observable<boolean> {
        const req = this.http.put('/rest/v1/email_folder/rename', {
            'new_folder': newFolderName,
            'folder_id': folderId
        }).pipe(share());
        this.subscribeShowBackendErrors(req);
        return req.pipe(filter((res: any) => res.status === 'success'));
    }

    emptyFolder(folderId: number): Observable<boolean> {
        const req = this.http.put('/rest/v1/email_folder/empty', {
            'folder_id': folderId
        }).pipe(share());
        this.subscribeShowBackendErrors(req);
        return req.pipe(filter((res: any) => res.status === 'success'));
    }

    updateFolderCounts(folderName: string): Observable<any> {
        return this.http.post('/rest/v1/email_folder/stats/' + folderName, {});
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
        return req.pipe(filter((res: any) => res.status === 'success'));
    }

    deleteFolder(folderid: number): Observable<boolean> {
        const req = this.http.delete(`/rest/v1/email_folder/delete/${folderid}`).pipe(share());
        this.subscribeShowBackendErrors(req);
        return req.pipe(filter((res: any) => res.status === 'success'));
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

    public moveToFolder(messageIds: number[], toFolderId: number, fromFolderId: number): Observable<any> {
        return this.http.post('/rest/v1/email/move', { messages: messageIds, folder_id: toFolderId, from_folder_id: fromFolderId });
    }

    public trainSpam(params): Observable<any> {
        return this.http.post('/rest/v1/spam/', JSON.stringify(params));
    }

    // Moves to Trash if not already in Trash
    // Deletes if currently in Trash
    public deleteMessages(messageIds: number[]): Observable<any> {
        const ids = messageIds.join(',');
        return this.http.delete(`/rest/v1/email/${ids}`);
    }

    public markSeen(messageId: any, seen_flag_value = 1): Observable<any> {
        return this.http.put('/rest/v1/email/' + messageId, JSON.stringify({ seen_flag: seen_flag_value }));
    }

    public markFlagged(messageId: any, flagged_flag_value = 1): Observable<any> {
      return this.http.put('/rest/v1/email/' + messageId, JSON.stringify({ flagged_flag: flagged_flag_value }));
    }

    private postForm(params): Observable<any> {
        return this.http.post('/ajax', params, { responseType: 'text' });
    }

    public getMessageFields(messageId: number): Observable<MessageFields> {
        return this.http.get(`/rest/v1/email/${messageId}/fields`).pipe(
            map((res: any) => res.result as MessageFields));
    }

    public getProfiles(): Observable<Identity[]> {
        return this.http.get('/rest/v1/profiles').pipe(
            map((res: any) => {
                return res.results.map(p => Identity.fromObject(p));
            }));
    }

    public createProfile(profileData: any): Observable<boolean> {
        const req = this.http.post(
            '/rest/v1/profile',
            profileData
        ).pipe(share());
        this.subscribeShowBackendErrors(req);
        return req.pipe(filter((res: any) => res.status === 'success'));
    }

    // FIXME: This should be PATCH
    public updateProfile(profileId: number, profileData: any): Observable<boolean> {
        const req = this.http.put(
            '/rest/v1/profile/' + profileId,
            profileData
        ).pipe(share());
        this.subscribeShowBackendErrors(req);
        return req.pipe(filter((res: any) => res.status === 'success'));
        
    }

    public deleteProfile(profileId: number): Observable<boolean> {
        const req = this.http.delete(
            '/rest/v1/profile/' + profileId
        ).pipe(share());
        this.subscribeShowBackendErrors(req);
        return req.pipe(filter((res: any) => res.status === 'success'));
    }

    // FIXME: This should be a POST
    public resendValidationEmail(profileId: number): Observable<boolean> {
        const req = this.http.put(
            '/rest/v1/profile/' + profileId + '/resend_validation_email',
            {}
        ).pipe(share());
        this.subscribeShowBackendErrors(req);
        return req.pipe(filter((res: any) => res.status === 'success'));
    }

    public updateFromPriorities(priorities: FromPriority[]) {
        const req = this.http.post(
          '/rest/v1/profile/from_priority/', {"from_priorities": priorities }
        ).pipe(share());
        this.subscribeShowBackendErrors(req);
        return req.pipe(filter((res: any) => res.status === 'success'));
    }
    
    public getAliasLimits(): Observable<any> {
        return this.http.get('/rest/v1/aliases/limits');
    }

    public getRunboxDomains(): Observable<string[]> {
        return this.http.get('/rest/v1/runbox_domains')
            .pipe(
                map((res: any) => res.results),
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
            if (draftModel.reply_to) {
                params.append('reply_to', draftModel.reply_to);
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

    public getVTimezone(tzname: string): Observable<any> {
        const tz_file = tzname + '.ics';
        return this.http.get('/_ics/' + tz_file, {responseType: 'text'});
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

    public payWithBitpay(tid: number, return_url: string, cancel_url: string): Observable<any> {
        return this.http.post('/rest/v1/account_product/crypto/pay', {
            tid, return_url, cancel_url
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

    public setupCreditCard(): Observable<any> {
        return this.http.post('/rest/v1/account_product/payment_methods/', {}).pipe(
            map((res: HttpResponse<any>) => res['result'])
        );
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

    getProductDomain(apid: number): Observable<string> {
        return this.http.get('/rest/v1/account_product/product_domain/' + apid).pipe(
            map((res: HttpResponse<any>) => res['result'])
        );
    }

    getPreferences(): Observable<PreferencesResult> {
        return this.http.get('/rest/v1/webmail/preferences').pipe(
            map((res: HttpResponse<any>) => res['result'])
        );
    }

    setPreferences(level, preferences): Observable<PreferencesResult> {
        return this.http.post('/rest/v1/webmail/preferences', preferences).pipe(
            map((res: HttpResponse<any>) => res['result'])
        );
    }

    getSavedSearches(): Observable<SavedSearchStorage> {
        return this.http.get('/rest/v1/webmail/saved_searches').pipe(
            map((res: HttpResponse<any>) => res['result'])
        );
    }

    setSavedSearches(savedSearches: SavedSearchStorage): Observable<SavedSearchStorage> {
        return this.http.post('/rest/v1/webmail/saved_searches', savedSearches).pipe(
            map((res: HttpResponse<any>) => res['result'])
        );
    }
}
