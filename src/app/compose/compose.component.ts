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

import {
    Input, Output, EventEmitter, Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, OnInit
} from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { FromAddress } from '../rmmapi/from_address';
import { Observable, Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DraftDeskService, DraftFormModel } from './draftdesk.service';
import { HttpClient, HttpEventType, HttpHeaders, HttpRequest } from '@angular/common/http';

import { FormGroup, FormBuilder } from '@angular/forms';
import { debounceTime, mergeMap } from 'rxjs/operators';
import { DialogService } from '../dialog/dialog.service';
import { TinyMCEPlugin } from '../rmm/plugin/tinymce.plugin';
import { isValidEmailList, isValidEmailArray } from './emailvalidator';
import { MailAddressInfo } from '../xapian/messageinfo';

declare const tinymce: any;
declare const MailParser;

@Component({
    moduleId: 'angular2/app/compose/',
    // tslint:disable-next-line:component-selector
    selector: 'compose',
    templateUrl: 'compose.component.html',
    styleUrls: ['compose.component.scss']
})
export class ComposeComponent implements AfterViewInit, OnDestroy, OnInit {
    static tinymceinstancecount = 1;

    @ViewChild('editor') editorRef: ElementRef;
    @ViewChild('attachmentFileUploadInput') attachmentFileUploadInput: any;
    @ViewChild('messageTextArea', { read: ElementRef }) messageTextArea: ElementRef;

    editor: any = null;
    editorId: string;
    editorContent: string;
    hasCC = false;
    hasBCC = false;
    public showDropZone = false;
    public draggingOverDropZone = false;
    public editing = false;
    public isUnsaved = false;
    public uploadprogress: number = null;
    public uploadingFiles: File[] = null;
    public uploadRequest: Subscription = null;
    public saved: Date = null;
    public tinymce_plugin: TinyMCEPlugin;
    has_pasted_signature: boolean;
    signature: string;
    selector: string;

    saveErrorMessage: string;

    shouldReturnToPreviousPage = false;

    public formGroup: FormGroup;

    @Input() model: DraftFormModel = new DraftFormModel();
    @Output() draftDeleted: EventEmitter<number> = new EventEmitter();

    constructor(private router: Router,
        public snackBar: MatSnackBar,
        private rmmapi: RunboxWebmailAPI,
        public draftDeskservice: DraftDeskService,
        private http: HttpClient,
        private formBuilder: FormBuilder,
        private location: Location,
        private dialogService: DialogService
    ) {
        this.tinymce_plugin = new TinyMCEPlugin();
        this.editorId = 'tinymceinstance_' + (ComposeComponent.tinymceinstancecount++);
    }

    ngOnInit() {
        if (this.model.isUnsaved()) {
            this.editing = true;
            this.isUnsaved = true;
            this.shouldReturnToPreviousPage = true;
            const from: FromAddress = this.draftDeskservice.froms.find((f) =>
                f.nameAndAddress === this.model.from || f.email === this.model.from);

            this.has_pasted_signature = false;
            if (!from) {
                this.model.from = this.draftDeskservice.froms && this.draftDeskservice.froms.length > 0 ?
                    this.draftDeskservice.froms[0].nameAndAddress : '';
            } else {
                this.model.from = from.nameAndAddress;
                if ( from.is_signature_html ) {
                    this.model.useHTML = true;
                }
                if ( !this.has_pasted_signature && from.signature ) {
                    this.has_pasted_signature = true;
                    this.signature = from.signature;
                    this.model.msg_body = this.signature.concat('\n\n', this.model.msg_body);
                }
            }
        } else {
            this.rmmapi.getMessageContents(this.model.mid).subscribe(msgObj =>
                this.model.preview = DraftFormModel.trimmedPreview(msgObj.text.text)
            );
        }

        this.formGroup = this.formBuilder.group(this.model);

        // Mark not saved if changes
        this.formGroup.valueChanges.subscribe(() => this.saved = null);

        // Auto save
        this.formGroup.valueChanges
            .pipe(debounceTime(1000))
            .subscribe(() => this.submit(false));

        this.formGroup.controls.from.valueChanges
            .pipe(debounceTime(1000))
            .subscribe((selected_from_address) => {
                const from: FromAddress = this.draftDeskservice.froms.find((f) =>
                    f.nameAndAddress === selected_from_address);
                if ( this.formGroup.controls.msg_body.pristine ) {
                    if ( this.signature && from.signature ) {
                        // replaces current signature with new one
                        const new_signature = from.signature;
                        const rgx = new RegExp('^' + this.signature, 'g');
                        const msg_body = this.formGroup.controls.msg_body.value.replace(rgx, new_signature);
                        this.signature = new_signature;
                        if (this.formGroup.value.useHTML && this.editor) {
                            this.editor.setContent(msg_body);
                        } else {
                            this.formGroup.controls.msg_body.setValue(msg_body);
                        }
                    } else if ( !this.signature && from.signature) {
                        const msg_body = from.signature.concat('\n\n', this.model.msg_body);
                        this.signature = from.signature;
                        if (this.formGroup.value.useHTML && this.editor) {
                            this.editor.setContent(msg_body);
                        } else {
                            this.formGroup.controls.msg_body.setValue(msg_body);
                        }
                        this.formGroup.controls.useHTML.setValue( from.is_signature_html );
                    }
                }
            });
    }

    ngAfterViewInit() {
        let dragLeaveTimeout = null;
        window.addEventListener('dragleave', () => {
            if (!dragLeaveTimeout) {
                // Drag leave events are fired all the time - so add some throttling on them
                dragLeaveTimeout = setTimeout(() => this.hideDropZone(), 100);
            }
        });

        window.addEventListener('drop', () => this.hideDropZone());
        window.addEventListener('dragover', (event) => {
            const dt = event.dataTransfer;

            if (dt.types) {
                let foundFilesType = false;
                for (let n = 0; n < dt.types.length; n++) {
                    if (dt.types[n] === 'Files' || dt.types[n] === 'application/x-moz-file') {
                        foundFilesType = true;
                        break;
                    }
                }
                if (foundFilesType) {
                    event.preventDefault();
                    if (dragLeaveTimeout) {
                        clearTimeout(dragLeaveTimeout);
                        dragLeaveTimeout = null;
                    }
                    this.showDropZone = true;
                }
            }
        });

        if (this.model.mid <= -1) {
            this.htmlToggled();
        }
    }

    // where event is hopefully a MailAddressInfo[]
    public onUpdateRecipient(field: string, event) {
        this.model[field] = event;
        if (field === 'cc' && event.length === 0) {
            this.hasCC = false;
        }
        if (field === 'bcc' && event.length === 0) {
            this.hasBCC = false;
        }
        // Leaving this for now as it triggers auto-save
        const recipientString = event.map((recipient) => recipient.nameAndAddress).join(',');
        this.formGroup.controls[field].setValue(recipientString);
    }

    public hideDropZone() {
        this.draggingOverDropZone = false;
        this.showDropZone = false;
    }

    public attachFilesClicked() {
        this.attachmentFileUploadInput.nativeElement.click();
    }

    public onFilesSelected(event) {
        this.uploadFiles(event.target.files);
    }

    public displayWithoutRBWUL(filename: string): string {
        if (filename && filename.indexOf('RBWUL') === 0) {
            return filename.substring(filename.indexOf('_') + 1);
        } else {
            return filename;
        }
    }

    public dropFiles(event) {
        event.preventDefault();
        this.uploadFiles(event.dataTransfer.files);
        this.hideDropZone();
    }


    public removeAttachment(attachmentIndex: number) {
        this.model.attachments.splice(attachmentIndex, 1);
        this.submit();
    }

    public uploadFiles(files: File[]) {
        this.uploadprogress = 0;
        this.uploadingFiles = files;
        const formdata: FormData = new FormData();
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            let fileName = file['webkitRelativePath'] ?
                file['webkitRelativePath'] :
                file.name;

            // Replace folder separator with underline
            fileName = fileName.replace(/\//g, '_');
            fileName = fileName.replace(/\\/g, '_'); // Don't know about windows, but better be safe

            // Add the file to the request.
            formdata.append('attachment', file, fileName);
        }
        formdata.append('mid', '' + this.model.mid);
        formdata.append('attach', 'Attach');
        formdata.append('ajaxAttach', 'Attach');

        this.uploadRequest = this.http.request(new HttpRequest<any>(
            'POST', '/ajax/upload_attachment', formdata,
            { reportProgress: true , headers: new HttpHeaders({ 'ngsw-bypass': '1' }) }
        )).subscribe((event) => {
            if (event.type === HttpEventType.UploadProgress) {
                const progress = event.loaded * 100 / event.total;
                this.uploadprogress = progress === 100 ? null : progress;
            } else if (event.type === HttpEventType.Response) {
                if (!this.model.attachments) {
                    this.model.attachments = [];
                }
                (event.body as any).result.attachments
                    .forEach((att: any) => {
                        att.file = att.filename;
                        this.model.attachments.push(att);
                    });

                this.uploadprogress = null;
                this.uploadingFiles = null;
                this.submit();
            }
        }, error => {
            this.uploadprogress = null;
            this.uploadingFiles = null;
            this.snackBar.open(`Error uploading attachments: ${error.statusText}`, 'OK');
        });
    }

    public cancelAttachmentUpload() {
        this.uploadRequest.unsubscribe();
        this.uploadprogress = null;
        this.uploadingFiles = null;
    }

    public editDraft() {
        if (this.model.mid > 0) {
            this.rmmapi.getMessageContents(this.model.mid, true)
                .subscribe((result: any) => {
                    const model = new DraftFormModel();
                    model.mid = typeof result.mid === 'string' ? parseInt(result.mid, 10) : result.mid;
                    model.attachments = result.attachments.map((att) => Object.assign({
                        file_url: att.filename,
                        file: att.filename
                    }, att));

                    const from: any = result.headers.from;
                    if (from) {
                        model.from = from.value && from.value[0] ?
                            from.value[0].name !== 'undefined' ? from.text : from.value[0].address
                            : null;
                    }
                    if (result.headers.to) {
                        model.to = result.headers.to.value.map((entry) => new MailAddressInfo(entry.name, entry.address));
                    }
                    if (result.headers.cc) {
                        model.cc = result.headers.cc.value.map((entry) => new MailAddressInfo(entry.name, entry.address));
                        this.hasCC = true;
                    }
                    if (result.headers.bcc) {
                        model.bcc = result.headers.bcc.value.map((entry) => new MailAddressInfo(entry.name, entry.address));
                        this.hasBCC = true;
                    }

                    model.subject = result.headers.subject;
                    if (result.text) {
                        if (result.text.html) {
                            model.msg_body = result.text.html;
                            model.useHTML = true;
                        } else {
                            model.msg_body = result.text.text;
                        }
                        model.preview = result.text.text;
                    }

                    if (!model.msg_body) {
                        model.msg_body = '';
                    }

                    this.model = model;
                    this.editing = true;

                    this.formGroup.patchValue(this.model, { emitEvent: false });

                    this.htmlToggled();
                }, err => {
                    this.snackBar.open(`Error opening draft for editing ${err}`, 'OK');
                });
        } else {
            this.editing = true;
        }
    }

    public htmlToggled() {
        if (this.formGroup.value.useHTML) {
            this.selector = `html-editor-${Math.floor(Math.random() * 10000000000)}`;
            const options = {
                base_url: this.location.prepareExternalUrl('/tinymce/'), // Base for assets such as skins, themes and plugins
                selector: '#' + this.selector,
                setup: editor => {
                    this.editor = editor;
                    editor.on('Change', () => {
                        this.formGroup.controls['msg_body'].setValue(editor.getContent());
                    });
                },
                init_instance_callback: (editor) => {
                    editor.setContent(
                        this.formGroup.value.msg_body ?
                            this.formGroup.value.msg_body.replace(/\n/g, '<br />\n') :
                            ''
                    );
                }
            };
            this.tinymce_plugin.create(options);
        } else {
            if (this.editor) {
                const textContent = this.editor.getContent({ format: 'text' });
                this.tinymce_plugin.remove(this.editor);
                this.editor = null;

                console.log('Back to pain text');

                this.formGroup.controls['msg_body'].setValue(
                    textContent
                );
            }
        }
    }

    public trashDraft() {
        const snackBarRef = this.snackBar.open('Deleting');
        this.rmmapi.trashMessages([this.model.mid]).subscribe(() => {
            snackBarRef.dismiss();
            this.draftDeleted.emit(this.model.mid);
            this.exitIfNeeded();
        });
    }

    exitIfNeeded() {
        if (this.shouldReturnToPreviousPage) {
            this.location.back();
        }
    }

    exitToTable() {
        this.router.navigate(['/']);
    }

    public cancelDraft() {
        this.draftDeleted.emit(this.model.mid);
        this.exitIfNeeded();
    }

    public downloadMessage(): Observable<any> {
        return new Observable((observer) => {
            const oReq = new XMLHttpRequest();
            oReq.open('GET', '/mail/download_message?msgid=' + this.model.mid, true);
            oReq.responseType = 'arraybuffer';
            oReq.onreadystatechange = () => {
                if (oReq.readyState === XMLHttpRequest.DONE && oReq.status !== 200) {

                    if (oReq.status === 403) {
                        console.log('forbidden');
                    }
                    observer.error(oReq.status + ': ' + oReq.statusText);
                } else if (oReq.readyState === XMLHttpRequest.DONE && oReq.status === 200) {
                    const arrayBuffer = oReq.response; // Note: not oReq.responseText

                    if (arrayBuffer) {
                        try {
                            const mailparser = new MailParser.MailParser();
                            mailparser.on('end', (mail_object) => {
                                observer.next(mail_object);
                            });

                            let chunksize = 8192;
                            let offset = 0;

                            while (arrayBuffer.byteLength > offset) {
                                if (offset + chunksize > arrayBuffer.byteLength) {
                                    chunksize = arrayBuffer.byteLength - offset;
                                }

                                mailparser.write(String.fromCharCode.apply(null,
                                    new Uint8Array(arrayBuffer.slice(offset, offset + chunksize))));
                                offset += chunksize;
                            }
                            mailparser.end();
                        } catch (e) {
                            observer.error(e);
                        }
                    }
                }
            };
            oReq.send(null);
        });
    }

    public close() {
        this.editing = false;
        this.exitIfNeeded();
    }

    public submit(send: boolean = false) {
        if (send) {
            let validemails = false;
            validemails = isValidEmailArray(this.model.to);
            if (!validemails) {
                this.saveErrorMessage = 'Cannot send email: TO field contains invalid email addresses';
            }
            if (validemails && this.model.cc.length > 0) {
                validemails = isValidEmailArray(this.model.cc);
                if (!validemails) {
                    this.saveErrorMessage = 'Cannot send email: CC field contains invalid email addresses';
                }
            }
            if (validemails && this.model.bcc.length > 0) {
                validemails = isValidEmailArray(this.model.bcc);
                if (!validemails) {
                    this.saveErrorMessage = 'Cannot send email: BCC field contains invalid email addresses';
                }
            }
            if (!validemails) {
                this.snackBar.open(
                    `Error sending: ${this.saveErrorMessage}`,
                    'Dismiss'
                );
                return;
            }
            this.dialogService.openProgressDialog();
        }
        this.model.from = this.formGroup.value.from;
        this.model.subject = this.formGroup.value.subject;
        this.model.msg_body = this.formGroup.value.msg_body;
        this.model.useHTML = this.formGroup.value.useHTML;

        if (this.model.useHTML && this.editor) {
            this.model.preview = DraftFormModel.trimmedPreview(this.editor.getContent({ format: 'text' }));
        } else {
            this.model.preview = DraftFormModel.trimmedPreview(this.model.msg_body);
        }

        const from = this.draftDeskservice.froms.find(
            (f) => this.model.from === f.nameAndAddress);

        if (send) {
            if (this.model.useHTML) {
                // Replace RBWUL with ContentId
                this.model.msg_body = this.model.msg_body
                    .replace(/\"[^"]*ajax\/download_draft_attachment\?filename\=RBWUL-([a-z0-9]+)_[^"]+\"/g, '"cid:$1"');
            }
            if (!from) {
                this.snackBar.open('You must set from address', 'OK', {duration: 1000});
                return;
            }
            // Use old form based API for sending as JSON api doesn't support this
            this.rmmapi.saveDraft(Object.assign(
                {}, this.model, {
                    from: from && from.id ?
                        from.name + '%' + from.email + '%' + from.id + '%' + from.folder :
                        from.email
                }
            ), send)
                .subscribe((res) => {
                    if (res[0] === '0') {
                        this.snackBar.open(res[1], 'Dismiss');
                        this.dialogService.closeProgressDialog();
                        return;
                    }

                    this.model.mid = parseInt(res[2], 10);
                    this.rmmapi.deleteCachedMessageContents(this.model.mid);
                    this.snackBar.open(res[1], null, { duration: 3000 });

                    this.draftDeleted.emit(this.model.mid);

                    this.dialogService.closeProgressDialog();
                    this.exitToTable();
                }, (err) => {
                    let msg = err.statusText;
                    if (err.field_errors) {
                        msg = Object.keys(err.field_errors)
                                .map(fieldname =>
                                    `field ${fieldname}: ${err.field_errors[fieldname][0]}`);
                    }
                    this.snackBar.open(
                        `Error sending: ${msg}`,
                        'Dismiss'
                    );
                    this.dialogService.closeProgressDialog();
                });
        } else {
            this.rmmapi.me.pipe(mergeMap((me) => {
                return this.http.post('/rest/v1/draft', {
                    type: 'draft',
                    username: me.username,
                    from: from && from.id ? from.name + '%' + from.email + '%' + from.id : from ? from.email : undefined,
                    from_email: from ? from.email : '',
                    to: this.model.to.map((recipient) => recipient.nameAndAddress).join(','),
                    cc: this.model.cc.map((recipient) => recipient.nameAndAddress).join(','),
                    bcc: this.model.bcc.map((recipient) => recipient.nameAndAddress).join(','),
                    subject: this.model.subject,
                    msg_body: this.model.msg_body,
                    in_reply_to: this.model.in_reply_to,
                    reply_to_id: this.model.reply_to_id,
                    tags: [],
                    ctype: this.model.useHTML ? 'html' : null,
                    save: send ? 'Send' : 'Save',
                    mid: this.model.mid,
                    attachments: this.model.attachments ?
                        this.model.attachments
                            .filter((att) => att.file !== 'UTF-8Q')
                            .filter((att) => att.file)
                            .map((att) => att.file)
                        : []
                });
            }
            )).subscribe((res: any) => {
                    if (res.mid) {
                        this.model.mid = typeof res.mid === 'string' ? parseInt(res.mid, 10) : res.mid;
                    }
                    this.rmmapi.deleteCachedMessageContents(this.model.mid);

                    this.isUnsaved = false;
                    this.saved = new Date();
                    this.saveErrorMessage = null;

                    if (send) {
                        this.draftDeleted.emit(this.model.mid);
                        this.snackBar.open(res.status_msg, null, { duration: 3000 });
                    }
                }, (err) => {
                    let msg = err.statusText;
                    if (err.field_errors) {
                        msg = Object.keys(err.field_errors)
                                .map(fieldname =>
                                    `field ${fieldname}: ${err.field_errors[fieldname][0]}`);
                    }
                    this.saveErrorMessage = `Error saving draft: ${msg}`;
                });
        }
    }

    ngOnDestroy() {
        if (this.editor) {
            tinymce.remove(this.editor);
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) {
            return '0 Bytes';
        }
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}
