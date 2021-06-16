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
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';

import { MatButtonToggle } from '@angular/material/button-toggle';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { MessageActions } from './messageactions';
import { ProgressDialog } from '../dialog/progress.dialog';
import { MobileQueryService } from '../mobile-query.service';

import { HorizResizerDirective } from '../directives/horizresizer.directive';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { MessageListService } from '../rmmapi/messagelist.service';
import { loadLocalMailParser } from './mailparser';

const showHtmlDecisionKey = 'rmm7showhtmldecision';
const resizerHeightKey = 'rmm7resizerheight';
const resizerPercentageKey = 'rmm7resizerpercentage';

const TOOLBAR_BUTTON_WIDTH = 40;

@Component({
  template: `
      <h3 mat-dialog-title>Really show HTML version?</h3>
      <mat-dialog-content>
          <p>Showing HTML formatted messages may send tracking information to the sender,
          and may also expose you to security threats.
	  You should only show the HTML version if you trust the sender.</p>

          <!-- <p><button mat-raised-button (click)="dialogRef.close()">No</button></p>
          <p><button mat-raised-button (click)="dialogRef.close('once')">Yes, only this time</button></p> -->
          <p><button mat-raised-button (click)="dialogRef.close('dontask')">Manually toggle HTML</button></p>
          <p><button mat-raised-button (click)="dialogRef.close('alwaysshowhtml')">Always show HTML if available</button></p>

      </mat-dialog-content>
  `
})
export class ShowHTMLDialogComponent {
  constructor(public dialogRef: MatDialogRef<ShowHTMLDialogComponent>) {

  }
}

@Component({
  moduleId: 'angular2/app/mailviewer/',
  // tslint:disable-next-line:component-selector
  selector: 'single-mail-viewer',
  templateUrl: 'singlemailviewer.component.html',
  styleUrls: ['singlemailviewer.component.css']
})
export class SingleMailViewerComponent implements OnInit, DoCheck, AfterViewInit {
  static rememberHTMLChosenForMessagesIds: { [messageId: number]: boolean } = {};

  _messageId = null; // Message id or filename

  // tslint:disable-next-line:no-output-on-prefix
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
  @ViewChild('forwardMessageHeader') messageHeaderHTML: ElementRef;
  @ViewChildren('forwardMessageHeader') messageHeaderHTMLQuery: QueryList<ElementRef>;
  @ViewChild(HorizResizerDirective) resizer: HorizResizerDirective;
  @ViewChildren(HorizResizerDirective) resizerQuery: QueryList<HorizResizerDirective>;
  @ViewChild('toolbarButtonContainer') toolbarButtonContainer: ElementRef;

  public downloadProgress: number;

  public mailObj: any;
  public err: any;

  public mailContentHTML: string = null;
  public fullMailDownloaded = false;

  public showHTMLDecision = 'dontask';
  public showHTML = false;
  public showAllHeaders = false;

  public SUPPORTS_IFRAME_SANDBOX = 'sandbox' in document.createElement('iframe');

  height = 0;
  previousHeight: number;
  previousHeightPercentage: number;

  morebuttonindex = 4;
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
  ) {
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

  public get messageId() {
    return this._messageId;
  }

  public ngOnInit() {
    this.messageActionsHandler.mailViewerComponent = this;
    this.showHTMLDecision = localStorage.getItem(showHtmlDecisionKey);
    // Update 2020-12, now preferring resizerPercentageKey
    this.previousHeight = parseInt(localStorage.getItem(resizerHeightKey), 10);
    this.previousHeightPercentage = parseInt(localStorage.getItem(resizerPercentageKey), 10);
  }

  public ngAfterViewInit() {
    // These two viewchildren queries are needed for loading an email from
    // a URL fragment:

    // Ensure resizer child is loaded before setting height
    this.resizerQuery.changes.subscribe((resizer: QueryList<HorizResizerDirective>) => {
      setTimeout(() => {
        if (this.adjustableHeight) {
          if (this.previousHeight) {
            // upgrade to Percentage
            this.previousHeightPercentage = resizer.first.heightOffsetToPercentage(this.previousHeight);
            this.previousHeight = undefined;
            localStorage.removeItem(resizerHeightKey);
          }
          if (this.previousHeightPercentage) {
            this.resizer.resizePercentage(this.previousHeightPercentage);
          } else {
            this.resizer.resizePercentage(50);
          }
        }
      }, 0);
    });

    // messageHeaderHTML loads after message is loaded
    this.messageHeaderHTMLQuery.changes.subscribe((messageHeaderHTML: ElementRef) => {
      setTimeout(() => {
          this.mailObj.origMailHeaderHTML = '<table>' + this.messageHeaderHTML.nativeElement.innerHTML + '</table>';
          this.mailObj.origMailHeaderText = this.messageHeaderHTML.nativeElement.innerText;
      }, 0);
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
      this.attachmentAreaCols = Math.floor(toolbarwidth / 200) + 1;
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

    if (!this.showHTML) {
      if (SingleMailViewerComponent.rememberHTMLChosenForMessagesIds[this.messageId] !== undefined) {
        this.showHTML = true;
        ProgressDialog.open(this.dialog);
      } else {

        console.log(this.showHTMLDecision);
        const decisionObservable = this.showHTMLDecision ?
          of(this.showHTMLDecision) : this.dialog.open(ShowHTMLDialogComponent).afterClosed();

        decisionObservable.subscribe(result => {
          switch (result) {
            case 'dontask':
            case 'alwaysshowhtml':
              localStorage.setItem(showHtmlDecisionKey, result);
              this.showHTMLDecision = result;
            // tslint:disable-next-line:no-switch-case-fall-through
            case 'once':
              // ProgressDialog.open(this.dialog);
              // SingleMailViewerComponent.rememberHTMLChosenForMessagesIds[this.messageId] = true;
              break;
          }
          this.showHTML = result ? true : false;
        });
      }
    } else {
      // SingleMailViewerComponent.rememberHTMLChosenForMessagesIds[this.messageId] = false;
      this.showHTML = false;
    }
  }

  public fetchMessageJSON() {
    // ProgressDialog.open(this.dialog);

    this.rbwebmailapi.getMessageContents(this.messageId).pipe(
      map((messageContents) => {
        const res: any = Object.assign({}, messageContents);
        res.subject = res.headers.subject;
        res.from = res.headers.from.value;
        res.to = res.headers.to ? res.headers.to.value : '';
        res.cc = res.headers.cc ? res.headers.cc.value : '';

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

        this.generateAttachmentURLs(res.attachments);

        // Remove style tag otherwise angular sanitazion will display style tag content as text

        if (res.text.html) {
          res.html = this.domSanitizer.bypassSecurityTrustHtml(res.sanitized_html);
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

        res.text = text;
        return res;
      }))
      .subscribe((res) => {
        if (res.html) {
          this.mailContentHTML = res.html;
          if (
            // res.has_sent_mail_to === '1' || // We have sent mail to this sender before, so let's trust the HTML and show it by default
            // SingleMailViewerComponent.rememberHTMLChosenForMessagesIds[this.messageId] ||
            this.showHTMLDecision === 'alwaysshowhtml') {

            this.showHTML = true;
          }
        } else {
          this.mailContentHTML = null;
        }

        this.mailObj = res;
        this.folder = res.folder;
        // ProgressDialog.close();
        if (this.mailObj.seen_flag === 0) {
          this.messageActionsHandler.markSeen();
        }
        setTimeout(() => {
          // If forwarding HTML copy mail header from the visible mail viewer header
          if (this.messageHeaderHTML) {
            this.mailObj.origMailHeaderHTML = '<table>' + this.messageHeaderHTML.nativeElement.innerHTML + '</table>';
            this.mailObj.origMailHeaderText = this.messageHeaderHTML.nativeElement.innerText;
          }
        }, 0
        );
      });
  }

  generateAttachmentURLs(attachments: any[]) {
    if (attachments) {
      attachments.forEach((att, ndx) => {
        let isImage = false;
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
          }
        }
      });
    }
  }

  saveShowHTMLDecision() {
    if (this.showHTMLDecision) {
      localStorage.setItem(showHtmlDecisionKey, this.showHTMLDecision);
    } else {
      SingleMailViewerComponent.rememberHTMLChosenForMessagesIds = {};
      localStorage.removeItem(showHtmlDecisionKey);
    }
  }

  adjustIframeHTMLHeight() {
    if (this.htmliframe) {
      const iframe = document.getElementById('iframe');
      const newHeight = this.htmliframe.nativeElement.contentWindow.document.body.scrollHeight;
      iframe.style.cssText = `height: ${newHeight + 20}px !important`;
    }
  }

  print() {
    let printablecontent = this.messageContents.nativeElement.innerHTML;
    if (this.htmliframe) {
      printablecontent = printablecontent.replace(/\<iframe.*\<\/iframe\>/g,
        this.htmliframe.nativeElement.contentWindow.document.documentElement.innerHTML
      );
    }
    this.printFrame.nativeElement.onload = () => this.printFrame.nativeElement.contentWindow.print();
    this.printFrame.nativeElement.src = URL.createObjectURL(new Blob([printablecontent],
        { type: 'text/html' }
      )
    );
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
              this.generateAttachmentURLs(parsed.attachments);
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
      localStorage.setItem(resizerPercentageKey, percentage.toString());
    }
  }

  showHTMLWarningDialog() {
    this.dialog.open(ShowHTMLDialogComponent).afterClosed()
      .subscribe(result => {
        switch (result) {
          case 'alwaysshowhtml':
            this.showHTML = true;
          // tslint:disable-next-line:no-switch-case-fall-through
          case 'dontask':
            localStorage.setItem(showHtmlDecisionKey, result);
            this.showHTMLDecision = result;
        }
      });
  }
}
