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

import 'tinymce';
import 'tinymce/themes/modern/theme';

import {
    Input, Output, EventEmitter, Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, OnInit
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { RunboxWebmailAPI, FromAddress } from '../rmmapi/rbwebmail';
import { Observable } from 'rxjs';
import { MatSnackBar } from '@angular/material';
import { DraftDeskService, DraftFormModel } from './draftdesk.service';
import { HttpClient, HttpEventType, HttpRequest } from '@angular/common/http';

import { FormGroup, FormBuilder } from '@angular/forms';
import { catchError, debounceTime, mergeMap } from 'rxjs/operators';

declare var tinymce: any;
declare var MailParser;

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
    // @ViewChild('msgBodyTextAreaAutoSize') msgBodyTextAreaAutoSize : MatTextareaAutosize;
    @ViewChild('attachmentFileUploadInput') attachmentFileUploadInput: any;
    @ViewChild('messageTextArea', { read: ElementRef }) messageTextArea: ElementRef;

    editor: any = null;
    editorId: string;
    editorContent: string;
    public showDropZone = false;
    public draggingOverDropZone = false;
    public editing = false;
    public isNew = false;
    public uploadprogress: number = null;
    public saved: Date = null;

    saveErrorMessage: string;

    @Input() shouldExitToTable = false;

    public formGroup: FormGroup;

    @Input() model: DraftFormModel = new DraftFormModel();
    @Output() draftDeleted: EventEmitter<number> = new EventEmitter();

    constructor(private router: Router,
        public snackBar: MatSnackBar,
        private rmmapi: RunboxWebmailAPI,
        public draftDeskservice: DraftDeskService,
        private http: HttpClient,
        private formBuilder: FormBuilder
    ) {

        this.editorId = 'tinymceinstance_' + (ComposeComponent.tinymceinstancecount++);
    }

    ngOnInit() {
        if (this.model.mid <= -1) {
            this.editing = true;
            this.isNew = true;
            if (this.isNew && this.model.subject) {
                this.shouldExitToTable = true;
            }

            const from: FromAddress = this.draftDeskservice.froms.find((f) =>
                f.nameAndAddress === this.model.from || f.email === this.model.from);

            if (!from) {
                this.model.from = this.draftDeskservice.froms && this.draftDeskservice.froms.length > 0 ?
                    this.draftDeskservice.froms[0].nameAndAddress : '';
            } else {
                this.model.from = from.nameAndAddress;
            }
        }

        this.formGroup = this.formBuilder.group(this.model);

        // Mark not saved if changes
        this.formGroup.valueChanges.subscribe(() => this.saved = null);

        // Auto save
        this.formGroup.valueChanges
            .pipe(debounceTime(1000))
            .subscribe(() => this.submit(false));
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

        this.http.request(
            new HttpRequest<any>('POST', '/ajax/upload_attachment', formdata, {
                    reportProgress: true})
           )
            .subscribe((event) => {
                if (event.type === HttpEventType.UploadProgress) {
                    const progress = event.loaded * 100 / event.total;
                    this.uploadprogress = progress === 100 ? null : progress;
                } else if (event.type === HttpEventType.Response) {
                    if (!this.model.attachments) {
                        this.model.attachments = [];
                    }
                    (event.body as any).result.attachments
                        .forEach((att) => {
                            att.file = att.filename;
                            this.model.attachments.push(att);
                        });

                    this.uploadprogress = null;
                    this.submit();
                }
            });
    }

    public editDraft() {
        if (this.model.mid > 0) {
            this.http.get('/rest/v1/email/' + this.model.mid)
                .pipe(
                    catchError(err => new Observable(o => o.next({ status: 'error', errors: [err] })))
                )
                .subscribe((mailObj: any) => {
                    if (mailObj.status === 'error') {
                        this.snackBar.open('Error opening draft for editing ' + mailObj.errors[0], 'OK');
                    } else {
                        const result = mailObj.result;
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
                            model.to = result.headers.to.text;
                        }
                        if (result.headers.cc) {
                            model.cc = result.headers.cc.text;
                        }
                        if (result.headers.bcc) {
                            model.bcc = result.headers.bcc.text;
                        }

                        model.subject = result.headers.subject;
                        if (result.text) {
                            if (result.text.html) {
                                model.msg_body = result.text.html;
                                model.useHTML = true;
                            } else {
                                model.msg_body = result.text.text;
                            }
                        }

                        if (!model.msg_body) {
                            model.msg_body = '';
                        }

                        this.model = model;
                        this.editing = true;

                        this.formGroup.patchValue(this.model, { emitEvent: false });

                        this.htmlToggled();
                    }
                });
        } else {
            this.editing = true;
        }
    }

    public htmlToggled() {
        if (this.formGroup.value.useHTML) {
            tinymce.baseURL = '/_js/tinymce_rmm7';
            tinymce.init({
                selector: '#' + this.editorRef.nativeElement.id,
                plugins: ['image'],
                image_list: (cb) => cb(this.model.attachments ? this.model.attachments.map(att => ({
                    title: this.displayWithoutRBWUL(att.file),
                    value: '/ajax/download_draft_attachment?filename=' + att.file
                })) : []),
                menubar: false,
                skin_url: '../_css/tinymceskin',
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
            });
        } else {
            if (this.editor) {
                const textContent = this.editor.getContent({ format: 'text' });
                tinymce.remove(this.editor);
                this.editor = null;

                console.log('Back to pain text');

                this.formGroup.controls['msg_body'].setValue(
                    textContent
                );
            }

            if (this.formGroup.controls['msg_body'].value) {
                setTimeout(() => {
                    this.moveTextAreaCaretPositionToStart();
                }, 0);
            }
        }
    }

    public trashDraft() {
        const snackBarRef = this.snackBar.open('Deleting');
        this.rmmapi.trashMessages([this.model.mid]).subscribe(() => {
            snackBarRef.dismiss();
            this.draftDeleted.emit(this.model.mid);
            this.checkIfExitToTable();
        });
    }

    checkIfExitToTable() {
        if (this.shouldExitToTable) {
            this.exitToTable();
        }
    }

    exitToTable() {
        this.router.navigate(['/']);
    }

    public cancelDraft() {
        this.draftDeleted.emit(this.model.mid);
        this.checkIfExitToTable();
    }

    public downloadMessage(): Observable<any> {
        return new Observable((observer) => {
            const oReq = new XMLHttpRequest();
            oReq.open('GET', '/mail/download_message?msgid=' + this.model.mid, true);
            oReq.responseType = 'arraybuffer';
            /*oReq.onprogress = (oEvent) => {
                if (oEvent.lengthComputable) {
                this.downloadProgress = Math.floor(oEvent.loaded * 100/ oEvent.total);
                } else {

                }
            };*/

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
    }

    public submit(send: boolean = false) {
        this.model.from = this.formGroup.value.from;
        this.model.bcc = this.formGroup.value.bcc;
        this.model.cc = this.formGroup.value.cc;
        this.model.to = this.formGroup.value.to;
        this.model.subject = this.formGroup.value.subject;
        this.model.msg_body = this.formGroup.value.msg_body;
        this.model.useHTML = this.formGroup.value.useHTML;


        if (this.model.useHTML && this.editor) {
            this.model.msg_body = this.editor.getContent();
            this.model.preview = this.editor.getContent({ format: 'text' }).substring(0, DraftFormModel.MAX_DRAFT_PREVIEW_LENGTH);
        } else {
            this.model.preview = this.model.msg_body.substring(0, DraftFormModel.MAX_DRAFT_PREVIEW_LENGTH);
        }

        if (this.model.preview.length === DraftFormModel.MAX_DRAFT_PREVIEW_LENGTH) {
            this.model.preview += '...';
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
                    this.model.mid = parseInt(res[2], 10);
                    this.snackBar.open(res[1], null, { duration: 3000 });

                    this.draftDeleted.emit(this.model.mid);
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
                });
        } else {
            this.rmmapi.me.pipe(mergeMap((me) => {
                return this.http.post('/rest/v1/draft', {
                    type: 'draft',
                    username: me.username,
                    from: from && from.id ? from.name + '%' + from.email + '%' + from.id : from ? from.email : undefined,
                    from_email: from ? from.email : '',
                    to: this.model.to,
                    cc: this.model.cc,
                    bcc: this.model.bcc,
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
                        this.model.mid = res.mid;
                    }
                    this.isNew = false;
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

    moveTextAreaCaretPositionToStart() {
        const txtElement = this.messageTextArea.nativeElement;
        if (txtElement.setSelectionRange) {
            txtElement.focus();
            txtElement.setSelectionRange(0, 0);
        } else if (txtElement.createTextRange) {
            const range = txtElement.createTextRange();
            range.moveStart('character', 0);
            range.select();
        }
        txtElement.scrollTo(0, 0);
    }
}

