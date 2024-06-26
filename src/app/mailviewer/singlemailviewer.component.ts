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

import { map } from 'rxjs/operators';
import {
  Component, Input, OnInit, Output, EventEmitter, ViewChild,
  ViewChildren,
  QueryList,
  ElementRef,
  AfterViewInit,
  DoCheck
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import DOMPurify from 'dompurify';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';

import { MatButtonToggle } from '@angular/material/button-toggle';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';

import { MessageActions } from './messageactions';
import { ProgressDialog } from '../dialog/progress.dialog';
import { MobileQueryService } from '../mobile-query.service';

import { HorizResizerDirective } from '../directives/horizresizer.directive';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { MessageListService } from '../rmmapi/messagelist.service';
import { loadLocalMailParser } from './mailparser';
import { RunboxContactSupportSnackBar } from '../common/contact-support-snackbar.service';
import { ContactsService } from '../contacts-app/contacts.service';
import { Contact, ContactKind } from '../contacts-app/contact';
import { ShowHTMLDialogComponent } from '../dialog/htmlconfirm.dialog';
import { MessageTableRowTool} from '../messagetable/messagetablerow';
import { PreferencesService } from '../common/preferences.service';
// import { ShowImagesDialogComponent } from '../dialog/imagesconfirm.dialog';

// const DOMPurify = require('dompurify');
const showHtmlDecisionKey = 'rmm7showhtmldecision';
const showImagesDecisionKey = 'rmm7showimagesdecision';
const resizerHeightKey = 'rmm7resizerheight';
const resizerPercentageKey = 'rmm7resizerpercentage';

const TOOLBAR_BUTTON_WIDTH = 30;


@Component({
  moduleId: 'angular2/app/mailviewer/',
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'single-mail-viewer',
  templateUrl: 'singlemailviewer.component.html',
  styleUrls: ['singlemailviewer.component.scss']
})
export class SingleMailViewerComponent implements OnInit, DoCheck, AfterViewInit {

  _messageId = null; // Message id or filename

  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onClose: EventEmitter<string> = new EventEmitter();
  @Output() afterViewInit: EventEmitter<any> = new EventEmitter();
  @Output() orientationChangeRequest: EventEmitter<string> = new EventEmitter();

  @Input() messageActionsHandler: MessageActions;
  @Input() adjustableHeight: boolean;
  @Input() showVerticalSplitButton = false;

  @ViewChild('printFrame') printFrame: ElementRef;
  @ViewChild('messageContents') messageContents: ElementRef;
  @ViewChild('htmliframe') htmliframe: ElementRef;
  @ViewChild('htmlToggleButton') htmlToggleButton: MatButtonToggle;
  @ViewChild('replyMessageHeader', {read: ElementRef}) replyHeaderHTML: ElementRef;
  @ViewChildren('replyMessageHeader', {read: ElementRef}) replyHeaderHTMLQuery: QueryList<ElementRef>;
  @ViewChild('forwardMessageHeader', {read: ElementRef}) messageHeaderHTML: ElementRef;
  @ViewChildren('forwardMessageHeader', {read: ElementRef}) messageHeaderHTMLQuery: QueryList<ElementRef>;
  @ViewChild(HorizResizerDirective) resizer: HorizResizerDirective;
  @ViewChildren(HorizResizerDirective) resizerQuery: QueryList<HorizResizerDirective>;
  @ViewChild('toolbarButtonContainer') toolbarButtonContainer: ElementRef;

  public downloadProgress: number;

  public mailObj: any;
  public err: any;

  public mailContentHTML: string = null;
  public mailContentHTMLWithImages: string = null;
  public mailContentHTMLWithoutImages: string = null;
  public fullMailDownloaded = false;

  public showHTMLDecision = 'dontask';
  public showImagesDecision = 'dontask';
  public showHTML = false;
  public showImages = false;
  public savedForThisSender = false;
  public savedAlways = false;
  public showAllHeaders = false;

  contacts: Contact[] = [];

  public SUPPORTS_IFRAME_SANDBOX = 'sandbox' in document.createElement('iframe');

  height = 0;
  previousHeight: number;
  previousHeightPercentage: number;

  morebuttonindex = 9;
  attachmentAreaCols = 2;

  folder: string;


  constructor(
    private domSanitizer: DomSanitizer,
    private http: HttpClient,
    public dialog: MatDialog,
    private rbwebmailapi: RunboxWebmailAPI,
    public messagelistservice: MessageListService,
    public mobileQuery: MobileQueryService,
    private router: Router,
    private supportSnackBar: RunboxContactSupportSnackBar,
    private snackBar: MatSnackBar,
    private contactsservice: ContactsService,
    private preferenceService: PreferencesService,
  ) {
    DOMPurify.addHook('afterSanitizeAttributes', function (node) {
      // set all elements owning target to target=_blank
      if ('target' in node) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener');
      }
    });
    this.contactsservice.contactsSubject.subscribe(contacts => {
      console.log('MailViewer: got the contacts!');
      this.contacts = contacts;
    });
    this.preferenceService.preferences.subscribe((prefs) => {
      this.showImagesDecision = prefs.get(`${this.preferenceService.prefGroup}:${showImagesDecisionKey}`);
      this.showHTMLDecision = prefs.get(`${this.preferenceService.prefGroup}:${showHtmlDecisionKey}`);
      const storedHeightPercentage  = parseInt(prefs.get(`${this.preferenceService.prefGroup}:${resizerPercentageKey}`), 10);
      this.previousHeightPercentage = storedHeightPercentage > 100
        ? 100
        : storedHeightPercentage < 0
        ? 0
        : storedHeightPercentage;
    });
  }

  public close(actionstring?: string) {
    const doClose = () => {
      if (this.resizer) {
        this.resizer.resizePercentage(0);
      }

      this.height = 0;
      this.messageId = null;

      if (this.onClose) {
        this.onClose.emit(actionstring);
      }
    };

    if (actionstring === 'goToDraftDesk') {
      this.router.navigate(['/compose']).then(() => doClose());
    } else {
      doClose();
    }
  }

  public get resizerHeight() {
    return this.resizer ? this.resizer.currentHeight : 0;
  }

  public get messageId() {
    return this._messageId;
  }

  public get showAttachments() {
    // Show attachments section IIF:
    // We have any attachments at all AND
    // we have non-inline (image) attachments OR
    // we're not viewing in HTML
    return this.mailObj.attachments.length > 0 && (
      this.mailObj.visible_attachment_count > 0 || !(this.mailContentHTML && this.showHTML && this.SUPPORTS_IFRAME_SANDBOX)
    );
  }

  public ngOnInit() {
    this.messageActionsHandler.mailViewerComponent = this;
    // this.showHTMLDecision = localStorage.getItem(showHtmlDecisionKey);
    // Update 2020-12, now preferring resizerPercentageKey
    // this.previousHeight = parseInt(localStorage.getItem(resizerHeightKey), 10);
    // const storedHeightPercentage  = parseInt(localStorage.getItem(resizerPercentageKey), 10);
    // this.previousHeightPercentage = storedHeightPercentage > 100
    //   ? 100
    //   : storedHeightPercentage < 0
    //     ? 0
    //   : storedHeightPercentage;
  }

  public ngAfterViewInit() {
    // These two viewchildren queries are needed for loading an email from
    // a URL fragment:

    // Ensure resizer child is loaded before setting height
    this.resizerQuery.changes.subscribe((resizer: QueryList<HorizResizerDirective>) => {
      setTimeout(() => {
        if (resizer.length > 0) {
          if (this.adjustableHeight) {
            if (this.previousHeight) {
              // upgrade to Percentage
              this.previousHeightPercentage = resizer.first.heightOffsetToPercentage(this.previousHeight);
              this.previousHeight = undefined;
              localStorage.removeItem(resizerHeightKey);
            }
            if (this.previousHeightPercentage) {
              resizer.first.resizePercentage(this.previousHeightPercentage);
            } else {
              resizer.first.resizePercentage(50);
            }
          }
        }
      });
    });

    this.afterViewInit.emit(this.messageId);
    this.calculateWidthDependentElements();
  }

  ngDoCheck() {
    this.calculateWidthDependentElements();
  }

  calculateWidthDependentElements() {
    if (this.toolbarButtonContainer) {
      const toolbarwidth = (this.toolbarButtonContainer.nativeElement as HTMLDivElement).clientWidth;
      this.morebuttonindex = Math.floor(
        toolbarwidth / TOOLBAR_BUTTON_WIDTH
      ) - 1;
      this.attachmentAreaCols = Math.floor(toolbarwidth / 150) + 1;
    }
  }
  public changeOrientation(orientation: string) {
    this.orientationChangeRequest.emit(orientation);
  }

  attachmentIconFromContentType(contentType: string) {
    if (contentType.indexOf('pdf') > -1) {
      return 'pdf-box';
    } else if (contentType.indexOf('audio') > -1) {
      return 'volume-high';
    } else if (contentType.indexOf('text/calendar') > -1) {
      return 'calendar';
    } else if (contentType.indexOf('text/vcard') > -1) {
      return 'account-multiple';
    } else if (contentType.indexOf('text') > -1) {
      return 'text-box';
    } else {
      return 'attachment';
    }
  }

  public toggleHtml(event) {
    event.preventDefault();

    this.savedAlways = false;
    this.savedForThisSender = false;
    if (!this.showHTML) {
      console.log(this.showHTMLDecision);
      const decisionObservable = this.showHTMLDecision ?
        of(this.showHTMLDecision) : this.dialog.open(ShowHTMLDialogComponent).afterClosed();

      decisionObservable.subscribe(result => {
        this.preferenceService.set(this.preferenceService.prefGroup, showHtmlDecisionKey, result);
        this.showHTMLDecision = result;
        this.showHTML = true;
      });
    } else {
      this.showHTML = false;
    }
  }

  public showExternalImages(event) {
    event.preventDefault();

    this.showImages = !this.showImages;
    this.savedAlways = false;
    this.savedForThisSender = false;
    // turn on:
    if (this.showImages) {
      this.mailContentHTML = this.mailContentHTMLWithImages;
    } else {
      this.mailContentHTML = this.mailContentHTMLWithoutImages;
    }
  }

  public saveDecisionGlobal(event) {
    event.preventDefault();

    if (this.showHTML) {
      this.showHTMLDecision = 'alwaysshowhtml';
      this.preferenceService.set(this.preferenceService.prefGroup,
                                 showHtmlDecisionKey, this.showHTMLDecision);
    }

    if (this.showImages) {
      this.showImagesDecision = 'alwaysshowimages';
      this.preferenceService.set(this.preferenceService.prefGroup,
                                 showImagesDecisionKey, this.showImagesDecision);
    }
    this.savedAlways = true;
    this.snackBar.open('Setting saved for all senders', 'OK', {
      duration: 3000,
    });
  }

  // Store current showHTML / showImages settings for the current sender
  public async saveDecisionForThisSender(event) {
    event.preventDefault();

    await this.contactsservice.findOrUpdateContact(
      this.mailObj.from[0].address,
      ContactKind.SETTINGSONLY,
      {
        show_html: this.showHTML,
        show_external_html: this.showImages
      }
    );

    this.savedForThisSender = true;
    this.snackBar.open('Setting saved for this sender', 'OK', {
      duration: 3000,
    });
  }

  public showHTMLForThisSender(email: string): boolean {
    if (this.showHTMLDecision
        && this.showHTMLDecision === 'alwaysshowhtml') {
      this.showHTML = true;
      this.savedAlways = true;
      return;
    }
    this.contactsservice.contactsSubject.subscribe(contacts => {
      const contact = contacts.find((c) => c.primary_email() === email);
      if (contact && contact.show_html) {
        this.showHTML = true;
        this.savedForThisSender = true;
      } else {
        this.showHTML = false;
      }
    });
  }

  public showImagesForThisSender(email: string): boolean {
    if (this.showImagesDecision
        && this.showImagesDecision === 'alwaysshowimages') {
      this.showImages = true;
      this.savedAlways = true;
      this.mailContentHTML = this.mailContentHTMLWithImages;
      return;
    }
    this.contactsservice.contactsSubject.subscribe(contacts => {
      const contact = contacts.find((c) => c.primary_email() === email);
      if (contact && contact.show_external_html) {
        this.showImages = true;
        this.savedForThisSender = true;
        this.mailContentHTML = this.mailContentHTMLWithImages;
      } else {
        this.showImages = false;
        this.mailContentHTML = this.mailContentHTMLWithoutImages;
      }
    });
  }

  public fetchMessageJSON() {
    // ProgressDialog.open(this.dialog);

    this.rbwebmailapi.getMessageContents(this.messageId).pipe(
      map((messageContents) => {
        const res: any = Object.assign({}, messageContents);
        if (res.status === 'warning') {
          // status === 'error' already displayed in showBackendErrors?
          // Skip if we previously had an issue loading this messge
          throw res;
        }
        res.subject = res.headers.subject;
        res.from = res.headers.from.value;
        res.to = res.headers.to ? res.headers.to.value : '';
        res.cc = res.headers.cc ? res.headers.cc.value : '';

        // RFC 5322 says "Date" and "From" are the only 2 required fields
        // and yet we get emails without em.
        if (!res.headers.date) {
          res.headers.date = '1970-01-01T00:00:00.000Z';
        }
        res.date = (
          (arr: string[]): Date =>
            new Date(
              parseInt(arr[1], 10),
              parseInt(arr[2], 10) - 1,
              parseInt(arr[3], 10),
              parseInt(arr[4], 10),
              parseInt(arr[5], 10),
              parseInt(arr[6], 10),
              parseInt(arr[7], 10)
            )
        )
          (
            new RegExp('([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])T' +
              '([0-9][0-9]):([0-9][0-9]):([0-9][0-9])\.([0-9][0-9][0-9])')
              .exec(res.headers.date)
          );

        res.date.setMinutes(res.date.getMinutes() - res.date.getTimezoneOffset());

        res.sanitized_html = this.expandAttachmentData(res.attachments, res.sanitized_html);
        res.sanitized_html_without_images = this.expandAttachmentData(res.attachments, res.sanitized_html_without_images);
        res.visible_attachment_count = res.attachments.filter((att) => !att.internal).length;


        // Remove style tag otherwise angular sanitazion will display style tag content as text

        if (res.text.html) {
          // Pre-sanitized, however we need to escape ampersands and
          // quotes for srcdoc, let angular do it:
          res.html = this.domSanitizer.bypassSecurityTrustHtml(DOMPurify.sanitize(res.sanitized_html));
          res.html_without_images = this.domSanitizer.bypassSecurityTrustHtml(DOMPurify.sanitize(res.sanitized_html_without_images));
        } else {
          res.html = null;
        }

        /**
         * Transform the links so that they are clickable
         */
        let text = res.text.text;
        res.rawtext = text;
        text = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        const LINKY_URL_REGEXP =
          /((ftp|https?):\/\/|(www\.)|(mailto:)?[A-Za-z0-9._%+-]+@)\S*[^\s.;,(){}<>"\u201d\u2019]/i,
          MAILTO_REGEXP = /^mailto:/i;

        let match;
        let raw = text;
        const html = [];
        let url;
        let i;

        while ((match = raw.match(LINKY_URL_REGEXP))) {
          // We can not end in these as they are sometimes found at the end of the sentence
          url = match[0];
          // if we did not match ftp/http/www/mailto then assume mailto
          if (!match[2] && !match[4]) {
            url = (match[3] ? 'http://' : 'mailto:') + url;
          }
          i = match.index;
          html.push(raw.substr(0, i));
          ((u, t) => {
            html.push('<a ');
            html.push('target="_blank" rel="noopener"');
            html.push('href="',
              u.replace(/"/g, '&quot;'),
              '">');
            html.push(t);
            html.push('</a>');
          })(url, match[0].replace(MAILTO_REGEXP, ''));

          raw = raw.substring(i + match[0].length);
        }
        html.push(raw);
        text = html.join('');

        // res.text = text;
        res.text = this.domSanitizer.bypassSecurityTrustHtml(DOMPurify.sanitize(res.text.textAsHtml)); // res.text.textAsHtml;
        return res;
      }))
      .subscribe((res) => {
        if (res.html) {
          // default to no images
          this.mailContentHTML = res.html_without_images;
          this.mailContentHTMLWithoutImages = res.html_without_images;
          this.mailContentHTMLWithImages = res.html;

          // if we have it on globally or for this sender:
          this.showHTMLForThisSender(res.from[0].address);
          // Show images if we previously saved for the current sender
          // or set it globally
          this.showImagesForThisSender(res.from[0].address);
        } else {
          this.mailContentHTML = null;
        }

        this.mailObj = res;
        this.folder = res.folder;

        // ProgressDialog.close();
        if (this.mailObj.seen_flag === 0) {
          this.messageActionsHandler.markSeen();
        }
      },
      err => {
        console.error('Error fetching message: ' + this.messageId);
        // httperror e.message, or status:error,errors:['strings']
        console.error(err);
        if (typeof(err) === 'string') {
          // HTTPErrorResponse as a string
          this.supportSnackBar.open(err);
        } else if (err.hasOwnProperty('errors')) {
          // Our own error object from rest api
          this.supportSnackBar.open(err.errors.join('.'));
        }
        // close the viewer pane
        this.close();
        // else - not outputting normal JS errors!
      }
      );
  }

  expandAttachmentData(attachments: any[], html: string): string {
    if (attachments.length > 0) {
      attachments.forEach((att, ndx) => {
        let isImage = false;
        att.internal = false;
        if (att.contentType && att.contentType.indexOf('image/') === 0) {
          isImage = true;
        }
        if (att.content) {
          att.downloadURL = URL.createObjectURL(new Blob([att.content], {
            type: att.contentType
          }));
          if (isImage) {
            att.thumbnailURL = this.domSanitizer.bypassSecurityTrustResourceUrl(att.downloadURL);
          }
        } else {
          att.downloadURL = '/rest/v1/email/' + this.messageId + '/attachment/' + ndx +
                            '?download=true';
          if (isImage) {
            att.thumbnailURL = '/rest/v1/email/' + this.messageId + '/attachmentimagethumbnail/' + ndx;
            if (html) {
              const newHtml = html.replace(new RegExp('src="cid:' + att.cid, 'g'), 'src="' + att.downloadURL);
              if (newHtml !== html) {
                att.internal = true;
                html = newHtml;
              }
            }
          }
        }
        // size in readable format:
        att.sizeDisplay = MessageTableRowTool.formatBytes(att.size, 2);
      });
    }
    return html;
  }

  saveShowHTMLDecision() {
    if (this.showHTMLDecision) {
      this.preferenceService.set(this.preferenceService.prefGroup,
                                 showHtmlDecisionKey, this.showHTMLDecision);
    } else {
      this.preferenceService.remove(this.preferenceService.prefGroup, showHtmlDecisionKey);
    }
  }

  saveShowImagesDecision() {
    if (this.showImagesDecision) {
      this.preferenceService.set(this.preferenceService.prefGroup,
                                 showImagesDecisionKey, this.showImagesDecision);
    } else {
      this.preferenceService.remove(this.preferenceService.prefGroup, showImagesDecisionKey);
    }
  }
  adjustIframeHTMLHeight() {
    if (this.htmliframe) {
      const iframe = document.getElementById('iframe');
      const newHeight = this.htmliframe.nativeElement.contentWindow.document.body.scrollHeight;
      iframe.style.cssText = `height: ${newHeight + 70}px !important`;
    }
  }

  print() {
    // Can't access print view inside iFrame, so we need to 
    // temporary hide buttons while the view is rendering
    const messageContents = document.getElementById('messageContents');
    const buttons = messageContents.getElementsByTagName('button');
    const htmlButtons = messageContents.getElementsByClassName('htmlButtons') as HTMLCollectionOf<HTMLElement>;
    const contactButtons = messageContents.getElementsByTagName('mat-icon') as HTMLCollectionOf<HTMLElement>;

    if (htmlButtons.length) {
      htmlButtons[0].style.display = 'none';
    }
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].style.display = 'none';
    }
    for (let i = 0; i < contactButtons.length; i++) {
      contactButtons[i].style.display = 'none';
    }

    let printablecontent = this.messageContents.nativeElement.innerHTML;
    if (this.htmliframe) {
      printablecontent = printablecontent.replace(/\<iframe[^]*\<\/iframe\>/g,
        this.htmliframe.nativeElement.contentWindow.document.documentElement.innerHTML
      );
    }
    this.printFrame.nativeElement.onload = () => this.printFrame.nativeElement.contentWindow.print();
    this.printFrame.nativeElement.src = URL.createObjectURL(new Blob([printablecontent],
        { type: 'text/html' }
      )
    );

    // Unhiding buttons
    if (htmlButtons.length) {
      htmlButtons[0].style.display = 'flex';
    }
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].style.display = 'inline';
    }
    for (let i = 0; i < contactButtons.length; i++) {
      contactButtons[i].style.display = 'inline-block';
    }
  }

  /**
   * EXPERIMENTAL, decrypt attachment (encrypted.asc) by sending it to pgpapp.no
   * @param attachmentIndex 
   */
  public decryptAttachment(attachmentIndex: number) {
    this.http.get('/rest/v1/email/' + this.messageId + '/attachment/' + attachmentIndex,
      { responseType: 'blob' })
      .subscribe((res) => {
        const pgpapp = window.open('https://pgpapp.no/app/messagehandler.html', '_blank');

        const pgpapplistener = async (msg) => {
          if (msg.origin === 'https://pgpapp.no') {
            if (msg.data.decryptedContent) {
              window.removeEventListener('message', pgpapplistener);
              pgpapp.close();

              const parseMail = await loadLocalMailParser().toPromise();
              const parsed = await parseMail(msg.data.decryptedContent);
              this.mailObj.text = parsed.text;
              this.mailObj.subject = parsed.subject;
              this.mailContentHTML = parsed.html;
              this.mailContentHTML = this.expandAttachmentData(parsed.attachments, parsed.html);
              this.mailObj.attachments = parsed.attachments;

              console.log(parsed);


            } else if (msg.data.ready) {
              pgpapp.postMessage(res, 'https://pgpapp.no');
            }
          }
        };
        window.addEventListener('message', pgpapplistener);
      });
  }

  public openAttachment(attachment: any) {
    if (attachment.contentType.indexOf('text/calendar') > -1) {
      this.router.navigate(['/calendar'], { queryParams: { import_from: attachment.downloadURL }});
      return;
    }
    if (attachment.contentType.indexOf('text/vcard') > -1) {
      this.router.navigate(['/contacts'], { queryParams: { import_from: attachment.downloadURL }});
      return;
    }

    // as long as we don't have a separate domain for attachments, we cannot show them in a new tab/window
    const alink = document.createElement('a');
    alink.download = attachment.filename;
    alink.href = attachment.downloadURL;
    alink.target = '_blank';
    document.documentElement.appendChild(alink);
    alink.click();
    document.documentElement.removeChild(alink);
  }

  public downloadAttachmentFromServer(attachmentIndex: number) {
    ProgressDialog.open(this.dialog);

    this.http.get(
      '/rest/v1/email/' + this.messageId + '/attachment/' + attachmentIndex,
      { observe: 'events', reportProgress: true, responseType: 'blob' }
    ).subscribe((res: HttpEvent<any>) => {
      console.log(res);
      if (res.type === HttpEventType.DownloadProgress && res.total) {
        const progress = res.loaded * 100 / res.total;
        ProgressDialog.setValue(progress === 100 ? null : progress);
      } else if (res.type === HttpEventType.Response) {
        const attachment = this.mailObj.attachments[attachmentIndex];
        attachment.content = res.body;
        this.downloadAttachment(attachment);
        ProgressDialog.close();
      }
    });
  }

  public downloadAttachment(attachment: any) {
    const a = document.createElement('a');
    const theurl = URL.createObjectURL(new Blob([attachment.content], { type: attachment.contentType }));
    a.href = theurl;
    a.download = attachment.filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.target = '_blank';
    document.body.removeChild(a);
    URL.revokeObjectURL(theurl);
  }

  public set messageId(id) {
    if (id !== this._messageId) {
      this.err = null;
      this.mailObj = null;
      this.fullMailDownloaded = false;
      this._messageId = id;
      this.showHTML = false;
      this.showImages = false;
      this.mailContentHTML = null;

      if (!id) {
        return;
      }

      this.fetchMessageJSON();
      setTimeout(() => {
        if (this.messageContents) {
          this.messageContents.nativeElement.scroll(0, 0);
        }
        // Only care about the horizontal pane height in horizontal mode
        if (this.adjustableHeight && this.resizer) {
          if (this.previousHeightPercentage) {
            this.resizer.resizePercentage(this.previousHeightPercentage);
          } else {
            this.resizer.resizePercentage(50);
          }
        }
      }, 0);
    }

  }

  heightChanged(percentage: number) {
    if (percentage > 0) {
      this.previousHeightPercentage = percentage;
      this.preferenceService.set(this.preferenceService.prefGroup,
                                 resizerPercentageKey, percentage.toString());
    }
  }

  // FIXME: Why do we have this (called from orange triangle icon)
  // AND the htmlSettingsMenu radio buttons!?
  showHTMLWarningDialog() {
    this.dialog.open(ShowHTMLDialogComponent).afterClosed()
      .subscribe(result => {
        switch (result) {
          case 'alwaysshowhtml':
            this.showHTML = true;
          // eslint-disable-next-line no-fallthrough
          case 'dontask':
            this.preferenceService.set(this.preferenceService.prefGroup,
                                       showHtmlDecisionKey, result);
            this.showHTMLDecision = result;
        }
      });
  }
}
