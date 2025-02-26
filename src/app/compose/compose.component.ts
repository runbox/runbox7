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

import {
    Input, Output, EventEmitter, Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, OnInit, NgZone
} from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { Observable, Subscription, AsyncSubject, BehaviorSubject } from 'rxjs';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { DraftDeskService, DraftFormModel } from './draftdesk.service';
import { HttpClient, HttpEventType, HttpHeaders, HttpRequest } from '@angular/common/http';

import { UntypedFormGroup, UntypedFormBuilder } from '@angular/forms';
import { debounceTime, distinctUntilChanged, mergeMap } from 'rxjs/operators';
import { DialogService } from '../dialog/dialog.service';
import { TinyMCEPlugin } from '../rmm/plugin/tinymce.plugin';
import { RecipientsService } from './recipients.service';
import { isValidEmailArray } from './emailvalidator';
import { MailAddressInfo } from '../common/mailaddressinfo';
import { Identity } from '../profiles/profile.service';
import { MessageListService } from '../rmmapi/messagelist.service';
import { MessageTableRowTool} from '../messagetable/messagetablerow';
import { DefaultPrefGroups, PreferencesService } from '../common/preferences.service';
import { objectEqualWithKeys } from '../common/util';

declare const MailParser;

const LOCAL_STORAGE_SHOW_POPULAR_RECIPIENTS = 'showPopularRecipients';
const LOCAL_STORAGE_DEFAULT_HTML_COMPOSE = 'composeInHTMLByDefault';
const DOWNLOAD_DRAFT_URL = '/ajax/download_draft_attachment?filename='

@Component({
    moduleId: 'angular2/app/compose/',
    // eslint-disable-next-line @angular-eslint/component-selector
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
    dragLeaveTimeout = null;
    public showDropZone = false;
    public draggingOverDropZone = false;
    public editing = false;
    public isUnsaved = false;
    public savingInProgress = false;
    // public uploadprogress: number = null;
    public uploadingFiles: File[] = [];
    public uploadRequest: Subscription = null;
    public saved: Date = null;
    public tinymce_plugin: TinyMCEPlugin;
    public isTemplate: boolean = false;
    finishImageUpload: AsyncSubject<any> = null;
    uploadProgress: BehaviorSubject<number> = new BehaviorSubject(-1);
    has_pasted_signature: boolean;
    signature: string;
    selector: string;

    saveErrorMessage: string;

    // here we keep the suggestions we get from RecipientsService
    suggestedRecipients: MailAddressInfo[] = [];
    // and here we keep suggestedRecipients but filtered
    // to not include the recipients already picked
    filteredSuggestions: MailAddressInfo[] = [];

    public formGroup: UntypedFormGroup;
    showPopularRecipients = true;
    composeInHTMLByDefault = false;

    @Input() model: DraftFormModel = new DraftFormModel();
    @Output() draftDeleted: EventEmitter<number> = new EventEmitter();

    constructor(private router: Router,
        public snackBar: MatSnackBar,
        private rmmapi: RunboxWebmailAPI,
        public draftDeskservice: DraftDeskService,
        private messageListService: MessageListService,
        private http: HttpClient,
        private formBuilder: UntypedFormBuilder,
        private location: Location,
        private dialogService: DialogService,
        recipientservice: RecipientsService,
        public preferenceService: PreferencesService,
        private _ngZone: NgZone,
    ) {
        this.tinymce_plugin = new TinyMCEPlugin();
        this.editorId = 'tinymceinstance_' + (ComposeComponent.tinymceinstancecount++);

        recipientservice.recentlyUsed.subscribe(suggestions => {
            this.suggestedRecipients = suggestions;
            this.updateSuggestions();
        });
        this.preferenceService.preferences.subscribe((prefs) => {
            this.showPopularRecipients = prefs.get(`${this.preferenceService.prefGroup}:${LOCAL_STORAGE_SHOW_POPULAR_RECIPIENTS}`) === 'true';
            this.composeInHTMLByDefault = prefs.get(`${DefaultPrefGroups.Global}:${LOCAL_STORAGE_DEFAULT_HTML_COMPOSE}`) === 'true';
        });
    }

    ngOnInit() {
        if (this.model.isUnsaved()) {
            this.editing = true;
            this.isUnsaved = true;
            const from: Identity = this.draftDeskservice.fromsSubject.value.find((f) =>
                f.nameAndAddress === this.model.from || f.email === this.model.from);

            this.has_pasted_signature = false;
            if (!from) {
                this.model.from = this.draftDeskservice.fromsSubject.value && this.draftDeskservice.fromsSubject.value.length > 0 ?
                    this.draftDeskservice.fromsSubject.value[0].nameAndAddress : '';
            } else {
                this.model.from = from.nameAndAddress;
                if ( !this.has_pasted_signature && from.signature ) {
                    this.has_pasted_signature = true;
                    this.signature = from.signature;
                    // Sig is HTML, or Reply/Fwd Draft is HTML (contains .html)
                    if ( from.is_signature_html || this.model.useHTML) {
                        this.model.useHTML = true;
                        this.model.html = this.signature.concat('\n\n', this.model.html || this.model.msg_body);
                    } else {
                        this.model.msg_body = this.signature.concat('\n\n', this.model.msg_body);
                    }

                }
            }
            if (this.composeInHTMLByDefault) {
                this.model.useHTML = true;
            }
            // above was true and we replied to a text-view email:
            if (this.model.useHTML && !this.model.html) {
                this.model.html = this.model.msg_body.replace(/\n/g, '<br />\n');
                console.log('Copied msg body to html attribute');
            }
            if (this.model.cc.length > 0) {
                this.hasCC = true;
            }
            if (this.model.bcc.length > 0) {
                this.hasBCC = true;
            }
            if (this.model.replying) {
                setTimeout(() => {
                    if (!this.model.useHTML) {
                        this.messageTextArea.nativeElement.setSelectionRange(0, 0);
                        this.messageTextArea.nativeElement.focus();
                    }
                });
            }
        } else {
          this.rmmapi.getMessageContents(this.model.mid).subscribe(
              msgObj => {
                  this.model.preview = msgObj.text && msgObj.text.text ? DraftFormModel.trimmedPreview(msgObj.text.text) : '';
                  // Re just auto-saved + reloaded this one, so keep editing it
                  if (this.model.mid === this.draftDeskservice.isEditing) {
                      this.loadDraft(msgObj);
                  }

              },
            err => {
              console.error('Error fetching message: ' + this.model.mid);
              console.error(err);
              if (typeof(err) === 'string') {
                this.snackBar.open(err);
              } else if (err.hasOwnProperty('errors')) {
                this.snackBar.open(err.errors.join('.'));
              }
            });
        }

        this.formGroup = this.formBuilder.group(this.model);

        // Mark not saved if changes
        this.formGroup.valueChanges.subscribe(() => this.saved = null);

        // Auto save
        this.formGroup.valueChanges
            .pipe(debounceTime(1000))
            .pipe(distinctUntilChanged((prev, curr) => {
                return objectEqualWithKeys(prev, curr, [
                    'to', 'cc', 'bcc', 'from', 'subject', 'msg_body', 'html',
                    'message_date', 'reply_to', 'reply_to_id', 'useHTML', 'mid',
                    'replying',
                ]);
            }))
            .subscribe(() => {
                // Disable auto-save when in template edit mode. This prevents
                // creating a draft while the user might be editing the template.
                // The side-effect is that a draft created from a template won't
                // have autosave until it was saved as a draft.
                if (this.model.tid) return;

                this.submit(false)
            });

        this.formGroup.controls.from.valueChanges
            .pipe(debounceTime(1000))
            .subscribe((selected_from_address) => {
                const from: Identity = this.draftDeskservice.fromsSubject.value.find((f) =>
                    f.nameAndAddress === selected_from_address);
                if ( this.formGroup.controls.msg_body.pristine ) {
                    if ( this.signature && from.signature ) {
                        // replaces current signature with new one
                        const new_signature = from.signature;
                        const rgx = new RegExp('^' + this.signature, 'g');
                        const msg_body = this.formGroup.controls.msg_body.value.replace(rgx, new_signature);
                        this.signature = new_signature;
                        if (this.formGroup.value.useHTML && this.editor) {
                            this.model.html = this.model.html.replace(rgx, new_signature);
                            this.editor.setContent(this.model.html);
                        } else {
                            this.formGroup.controls.msg_body.setValue(msg_body);
                        }
                    } else if ( !this.signature && from.signature) {
                        this.has_pasted_signature = true;
                        const msg_body = from.signature.concat('\n\n', this.model.msg_body);
                        this.signature = from.signature;
                        if (from.is_signature_html || (this.formGroup.value.useHTML && this.editor)) {
                            this.model.html = this.signature.concat('\n\n', this.model.html);
                            if (!this.formGroup.value.useHTML) {
                                this.formGroup.controls.msg_body.setValue(true);
                                this.htmlToggled();
                            } else {
                                this.editor.setContent(this.model.html);
                            }
                        } else {
                            this.formGroup.controls.msg_body.setValue(msg_body);
                        }
                    }
                }
            });

        this.formGroup.valueChanges.subscribe(_ => this.updateSuggestions());

        this._ngZone.runOutsideAngular(() => {
            window.addEventListener(
                'dragover', this.onDragOver.bind(this)
            );
            window.addEventListener(
                'dragleave', this.onDragLeave.bind(this)
            );
        });
    }

    ngAfterViewInit() {
        if (this.model.mid <= -1) {
            this.htmlToggled();
        }
    }

    onDragLeave(event: DragEvent) {
        // only do this once on any event in the window, else the whole thing
        // flickers
        event.stopImmediatePropagation();
        if (!this.dragLeaveTimeout) {
            // Drag leave events are fired all the time - so add some throttling on them
            this.dragLeaveTimeout = setTimeout(() => {
                this.hideDropZone();
            }, 100);
        }
        return false;
    }

    // on Drag over - entire window, if contains files, show the drop zone
    onDragOver(event: DragEvent) {
        if (this.showDropZone) {
            event.preventDefault();
            return false;
        }
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
                event.stopImmediatePropagation();
                event.preventDefault();
                if (this.dragLeaveTimeout) {
                    clearTimeout(this.dragLeaveTimeout);
                    this.dragLeaveTimeout = null;
                }
                this.showDropZone = true;
            }
        }
    }

    // where event is hopefully a MailAddressInfo[]
    public onUpdateRecipient(field: string, event) {
        this.model[field] = event;
        if (field === 'cc') {
            this.hasCC = event.length !== 0;
        }
        if (field === 'bcc') {
            this.hasBCC = event.length !== 0;
        }
        // Leaving this for now as it triggers auto-save
        const recipientString = event.map((recipient) => recipient.nameAndAddress).join(',');
        this.formGroup.controls[field].setValue(recipientString);
    }

    public hideDropZone() {
      this.draggingOverDropZone = false;
      this.showDropZone = false;
    }

    addRecipientFromSuggestions(recipient: MailAddressInfo) {
        const newRecipients = this.model.to.concat(recipient);

        this.onUpdateRecipient('to', newRecipients);
    }

    public attachFilesClicked() {
        this.attachmentFileUploadInput.nativeElement.click();
    }

    public onFilesSelected(event) {
        this.uploadFiles([...event.target.files]);
        this.attachmentFileUploadInput.nativeElement.value = '';
    }

    public displayWithoutRBWUL(filename: string): string {
        if (filename && filename.indexOf('RBWUL') === 0) {
            return filename.substring(filename.indexOf('_') + 1);
        } else {
            return filename;
        }
    }

    public dropFiles(event: DragEvent) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (this.uploadingFiles.length === 0) {
            this.uploadFiles(Array.from(event.dataTransfer.files));
            this.hideDropZone();
        }
    }


    public removeAttachment(attachmentIndex: number) {
        const toRemove = this.model.attachments[attachmentIndex];
        const escapedUrl = DOWNLOAD_DRAFT_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const attUrlRegex = new RegExp('<img\\ssrc="[^"]*' + escapedUrl + toRemove.filename + '"[^>]*>');
        this.model.html = this.model.html.replace(attUrlRegex, '');
        this.editor.setContent(this.model.html);
        this.model.attachments.splice(attachmentIndex, 1);
        this.submit();
    }

    public uploadFiles(files: File[]) {
        this.uploadProgress.next(0);
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
                this.uploadProgress.next(progress);
            } else if (event.type === HttpEventType.Response) {
                if (!this.model.attachments) {
                    this.model.attachments = [];
                }
                (event.body as any).result.attachments
                    .forEach((att: any) => {
                      att.file = att.filename;
                        att.sizeDisplay = MessageTableRowTool.formatBytes(att.size, 2);
                        this.model.attachments.push(att);
                    });

                this.uploadProgress.next(-1);
                this.uploadingFiles = [];
                if(this.finishImageUpload) {
                    // We were submitting a dropped image attachment
                    this.finishImageUpload.next((event.body as any).result.attachments[0].filename);
                    this.finishImageUpload.complete();
                    this.finishImageUpload = null;
                }
                this.submit();
            }
        }, error => {
            this.uploadProgress.next(-1);
            this.uploadingFiles = [];
            if(this.finishImageUpload) {
                // We were submitting a dropped image attachment
                this.finishImageUpload.next('');
                this.finishImageUpload.complete();
                this.finishImageUpload = null;
            }
            this.snackBar.open(`Error uploading attachments: ${error.statusText}`, 'OK');
        });
    }

    public tinyMCEUpload(blobInfo, progress) {
        return new Promise((resolve, reject) => {
            if(!this.finishImageUpload) {
                this.finishImageUpload = new AsyncSubject();
            }
            this.uploadProgress.subscribe((res) => {
                if(res > -1) {progress(res);}
            });
            this.finishImageUpload.subscribe((res) => {
                if(res.length > 0) {
                    resolve(DOWNLOAD_DRAFT_URL + res);
                } else {
                    reject({ message: 'Error storing image',
                             remove: true });
                }
            });
            this.uploadFiles([blobInfo.blob()]);
        });
    }

    public cancelAttachmentUpload() {
        this.uploadRequest.unsubscribe();
        this.uploadProgress.next(-1);
        if (this.finishImageUpload) {
            this.finishImageUpload.next('');
            this.finishImageUpload.complete();
        }
        this.uploadingFiles = [];
    }

    public loadDraft(msgObj) {
        if (msgObj.errors) {
            this.snackBar.open(msgObj.errors[0], 'Ok')
            throw msgObj
        }

        const model = new DraftFormModel();
        model.mid = typeof msgObj.mid === 'string' ? parseInt(msgObj.mid, 10) : msgObj.mid;
        this.draftDeskservice.isEditing = model.mid;
        model.attachments = msgObj.attachments
            ? msgObj.attachments.map((att) => Object.assign({
                file_url: att.filename,
                file: att.filename,
                sizeDisplay: MessageTableRowTool.formatBytes(att.size, 2)
            }, att))
            : [];

        const from: any = msgObj.headers.from;
        if (from) {
            model.from = from.value && from.value[0] ?
                from.value[0].name !== 'undefined' ? from.text : from.value[0].address
            : null;
        }
        if (msgObj.headers.to) {
            model.to = msgObj.headers.to.value.map((entry) => new MailAddressInfo(entry.name, entry.address));
        }
        if (msgObj.headers.cc) {
            model.cc = msgObj.headers.cc.value.map((entry) => new MailAddressInfo(entry.name, entry.address));
            this.hasCC = true;
        }
        if (msgObj.headers.bcc) {
            model.bcc = msgObj.headers.bcc.value.map((entry) => new MailAddressInfo(entry.name, entry.address));
            this.hasBCC = true;
        }

        model.subject = msgObj.headers.subject;
        if (msgObj.text) {
            if (msgObj.text.html) {
                model.html = msgObj.text.html;
                model.msg_body = msgObj.text.text;
                model.useHTML = true;
            } else {
                model.msg_body = msgObj.text.text;
            }
            model.preview = msgObj.text.text;
        }

        if (!model.msg_body) {
            model.msg_body = '';
        }

        this.model = model;
        this.editing = true;
        this.draftDeskservice.shouldReturnToPreviousPage = false;

        this.formGroup.patchValue(this.model, { emitEvent: false });

        this.htmlToggled();
    }

    public editDraft() {
        if (this.model.mid > 0) {
            this.rmmapi.getMessageContents(this.model.mid, true)
                .subscribe((result: any) => {
                    this.loadDraft(result);
                }, err => {
                  console.error('Error fetching message: ' + this.model.mid);
                  console.error(err);
                  if (typeof(err) === 'string') {
                    this.snackBar.open(`Error opening draft for editing ${err}`, 'OK');
                  } else if (err.hasOwnProperty('errors')) {
                    this.snackBar.open(`Error opening draft for editing ${err.errors.join('.')}`, 'OK');
                  }
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
                        this.formGroup.controls['msg_body'].setValue(editor.getContent({ format: 'text' }));
                        this.model.html = editor.getContent();
                    });
                    editor.on('remove', () => {
                        if(editor.queryCommandState('ToggleToolbarDrawer')) {
                            editor.execCommand('ToggleToolbarDrawer');
                        }
                    });
                },
                init_instance_callback: (editor) => {
                    editor.setContent(
                        this.model.html
                            ? this.model.html
                            :
                            this.formGroup.value.msg_body
                            ? this.formGroup.value.msg_body.replace(/\n/g, '<br />\n')
                            :  ''
                    );
                },
                image_list: (cb) => cb(this.model.attachments ? this.model.attachments.map(att => ({
                    title: this.displayWithoutRBWUL(att.file),
                    value: DOWNLOAD_DRAFT_URL + att.file
                })) : []),
                paste_data_images: true,
                automatic_uploads: true,
                images_upload_credentials: true,
                images_upload_handler: (blobInfo, progress) => {
                    return this.tinyMCEUpload(blobInfo, progress);
                },
                // upload_url: this.router.createUrlTree(['/rest/v1/attachment/upload/single']).toString(),
            };
            this.tinymce_plugin.create(options);
            this.preferenceService .set(DefaultPrefGroups.Global, LOCAL_STORAGE_DEFAULT_HTML_COMPOSE, 'true');
        } else {
            if (this.editor) {
                this.model.html = this.editor.getContent();
                const textContent = this.editor.getContent({ format: 'text' });
                this.tinymce_plugin.remove(this.editor);
                this.editor = null;

                console.log('Back to plain text');

                this.formGroup.controls['msg_body'].setValue(
                    textContent
                );
            }
            this.preferenceService.set(DefaultPrefGroups.Global, LOCAL_STORAGE_DEFAULT_HTML_COMPOSE, 'false');
        }
    }

    public trashDraft() {
        this.snackBar.open('Deleting');
        this.draftDeskservice.isEditing = -1;
        this.draftDeskservice.composingNewDraft = null;
        this.rmmapi.deleteMessages([this.model.mid]).subscribe(() => {
            this.draftDeleted.emit(this.model.mid);
            this.exitIfNeeded();
        });
    }

    exitIfNeeded() {
        if (this.draftDeskservice.shouldReturnToPreviousPage) {
            this.draftDeskservice.shouldReturnToPreviousPage = false;
            this.location.back();
        }
    }

    exitToTable() {
        this.router.navigate(['/']);
    }

    public cancelDraft() {
        this.draftDeskservice.isEditing = -1;
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
        this.draftDeskservice.isEditing = -1;
        this.draftDeskservice.composingNewDraft = null;
        this.exitIfNeeded();
    }

    public submit(send: boolean = false) {
        const isTemplate = Boolean(this.isTemplate ?? this.model.tid);

        if (this.savingInProgress) {
            return;
        }

        this.savingInProgress = true;

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
        this.model.msg_body = this.formGroup.value.useHTML
            ? this.model.html
            : this.formGroup.value.msg_body;
        this.model.useHTML = this.formGroup.value.useHTML;

        if (this.model.useHTML && this.editor) {
            this.model.preview = DraftFormModel.trimmedPreview(this.editor.getContent({ format: 'text' }));
        } else {
            this.model.preview = DraftFormModel.trimmedPreview(this.model.msg_body);
        }

        // this.model.from should have a value (cos it defaults)
        const from = this.draftDeskservice.fromsSubject.value.find(
            (f) => this.model.from === f.nameAndAddress || this.model.from === f.email);
        let draft_from = this.model.from;
        if (!from) {
            console.log(`Compose: Could not find ${this.model.from} in ${this.draftDeskservice.fromsSubject.value}`);
        } else {
            this.model.reply_to = from.reply_to;
            draft_from = from && from.id ?
                from.from_name + '%' + from.email + '%' + from.id + '%' + from.folder :
                from.email;
        }
        if (send) {
            if (this.model.useHTML) {
                // Replace RBWUL with ContentId
                const escapedUrl = DOWNLOAD_DRAFT_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                this.model.msg_body = this.model.msg_body
                    .replace(new RegExp('"[^"]*' + escapedUrl + 'RBWUL-([a-z0-9]+)_[^"]+"', 'g'), '"cid:$1"');
            }
            if (!from) {
                this.snackBar.open('You must set from address', 'OK', {duration: 1000});
                return;
            }
            // Use old form based API for sending as JSON api doesn't support this
            this.rmmapi.saveDraft(Object.assign(
                {}, this.model, {
                    from: draft_from
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

                    this.draftDeskservice.isEditing = -1;
                    this.draftDeleted.emit(this.model.mid);

                    this.savingInProgress = false;
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
                    this.savingInProgress = false;
                    this.dialogService.closeProgressDialog();
                });
        } else {
            this.rmmapi.me.pipe(mergeMap((me) => {
                return this.http.post('/rest/v1/draft', {
                    ...(isTemplate ? {
                        type: 'template',
                        mid: this.model.tid ?? this.model.mid,
                        tid: this.model.tid ?? this.model.mid,
                    } : {
                        type: 'draft',
                        mid: this.model.mid
                    }),
                    username: me.username,
                    from: from && from.id ? from.from_name + '%' + from.email + '%' + from.id : from ? from.email : undefined,
                    from_email: from ? from.email : '',
                    to: this.model.to.map((recipient) => recipient.nameAndAddress).join(','),
                    cc: this.model.cc.map((recipient) => recipient.nameAndAddress).join(','),
                    bcc: this.model.bcc.map((recipient) => recipient.nameAndAddress).join(','),
                    subject: this.model.subject,
                    msg_body: this.model.msg_body,
                    in_reply_to: this.model.in_reply_to,
                    reply_to_id: this.model.reply_to_id,
                    reply_to: this.model.reply_to,
                    tags: [],
                    ctype: this.model.useHTML ? 'html' : null,
                    save: send ? 'Send' : 'Save',
                    attachments: this.model.attachments ?
                        this.model.attachments
                            .filter((att) => att.file !== 'UTF-8Q')
                            .filter((att) => att.file)
                            .map((att) => att.file)
                        : []
                });
            }
            )).subscribe((res: any) => {
                this.messageListService.refreshFolderList();
                if (this.isTemplate)  {
                    this.snackBar.open('Saved to templates', 'Ok', { duration: 3000 });
                }

                if (res.mid) {
                    const newMid = typeof res.mid === 'string' ? parseInt(res.mid, 10) : res.mid;
                    if (this.model.isUnsaved()) {
                        // We saved in the middle of editing, store the mid so
                        // we can continue after the drafts update
                        this.draftDeskservice.isEditing = newMid;
                    }
                    this.model.mid = newMid;
                    this.draftDeskservice.composingNewDraft = null;
                }
                    this.rmmapi.deleteCachedMessageContents(this.model.mid);

                    this.isUnsaved = false;
                    this.saved = new Date();
                    this.saveErrorMessage = null;

                    this.savingInProgress = false;
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
                    this.savingInProgress = false;
                    this.saveErrorMessage = `Error saving draft: ${msg}`;
                });
        }
    }

    public saveTemplate() {
        this.isTemplate = true
        this.submit(false);
    }

    ngOnDestroy() {
        if (this.editor) {
            // turn off onChange handler because it changes the
            // msg_body and causes auto-save to trigger. See
            // https://github.com/runbox/runbox7/issues/644#issuecomment-1651655948
            this.editor.off('change');
            this.tinymce_plugin.remove(this.editor);
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

    recipientDragged(ev: DragEvent, recipient: MailAddressInfo) {
        ev.dataTransfer.setData('recipient', recipient.nameAndAddress);
    }

    recipientDropped(ev: DragEvent, target: string) {
        const addressLine = ev.dataTransfer.getData('recipient');

        const newMAI = MailAddressInfo.parse(addressLine);
        const newRecipients = this.model[target].concat(newMAI);

        this.onUpdateRecipient(target, newRecipients);
    }

    /// updates the displayed `suggestedRecipients`
    /// making sure it doesn't contain any existing recipients
    updateSuggestions() {
        const currentrecipients: MailAddressInfo[] = [].concat(this.model.to).concat(this.model.cc).concat(this.model.bcc);

        this.filteredSuggestions = this.suggestedRecipients.filter(
            s => !currentrecipients.find(r => r.address === s.address)
        ).slice(0, 10);
    }
}
