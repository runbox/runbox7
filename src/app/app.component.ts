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

import { AfterViewInit, Component, DoCheck, NgZone, OnInit, ViewChild, Renderer2, ChangeDetectorRef, OnDestroy } from '@angular/core';
import {
  CanvasTableSelectListener, CanvasTableComponent,
  CanvasTableContainerComponent
} from './canvastable/canvastable';
import { SingleMailViewerComponent } from './mailviewer/singlemailviewer.component';
import { SearchService } from './xapian/searchservice';

import { MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MatIconRegistry } from '@angular/material/icon';
import { MatSidenav } from '@angular/material/sidenav';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MoveMessageDialogComponent } from './actions/movemessage.action';
import { Router, RouterOutlet, ActivatedRoute } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { MessageTableRow, MessageTableRowTool } from './messagetable/messagetablerow';
import { MessageListService } from './rmmapi/messagelist.service';
import { MessageInfo } from './xapian/messageinfo';
import { InfoDialog, InfoParams } from './dialog/info.dialog';
import { RunboxMe, RunboxWebmailAPI, FolderListEntry } from './rmmapi/rbwebmail';
import { DraftDeskService } from './compose/draftdesk.service';
import { RMM7MessageActions } from './mailviewer/rmm7messageactions';
import { FolderListComponent, CreateFolderEvent, RenameFolderEvent, MoveFolderEvent } from './folder/folder.module';
import { SimpleInputDialog, SimpleInputDialogParams, ProgressDialog } from './dialog/dialog.module';
import { map, first, take, skip, bufferCount, mergeMap, filter, tap, throttleTime ,  debounceTime } from 'rxjs/operators';
import { ConfirmDialog } from './dialog/confirmdialog.component';
import { WebSocketSearchService } from './websocketsearch/websocketsearch.service';
import { WebSocketSearchMailRow } from './websocketsearch/websocketsearchmailrow.class';

import { BUILD_TIMESTAMP } from './buildtimestamp';
import { from, of, Observable } from 'rxjs';
import { xapianLoadedSubject } from './xapian/xapianwebloader';
import { SwPush } from '@angular/service-worker';
import { exportKeysFromJWK } from './webpush/vapid.tools';
import { MobileQueryService } from './mobile-query.service';
import { ProgressService } from './http/progress.service';
import { RMM } from './rmm';
import { environment } from '../environments/environment';
import { LogoutService } from './login/logout.service';
import {Hotkey, HotkeysService} from 'angular2-hotkeys';

const LOCAL_STORAGE_SETTING_MAILVIEWER_ON_RIGHT_SIDE_IF_MOBILE = 'mailViewerOnRightSideIfMobile';
const LOCAL_STORAGE_SETTING_MAILVIEWER_ON_RIGHT_SIDE = 'mailViewerOnRightSide';
const LOCAL_STORAGE_VIEWMODE = 'rmm7mailViewerViewMode';
const LOCAL_STORAGE_SHOWCONTENTPREVIEW = 'rmm7mailViewerContentPreview';
const LOCAL_STORAGE_KEEP_PANE = 'keepMessagePaneOpen';
const LOCAL_STORAGE_SHOW_UNREAD_ONLY = 'rmm7mailViewerShowUnreadOnly';

@Component({
  moduleId: 'angular2/app/',
  // tslint:disable-next-line:component-selector
  selector: 'app',
  styleUrls: ['app.component.css'],
  templateUrl: 'app.component.html'
})
export class AppComponent implements OnInit, AfterViewInit, CanvasTableSelectListener, DoCheck, OnDestroy {
  selectedRowIds: { [key: number]: boolean } = {};
  showSelectOperations: boolean;

  lastSearchText: string;
  searchText = '';
  dataReady: boolean;

  usewebsocketsearch = false;

  viewmode = 'messages';
  keepMessagePaneOpen = true;
  conversationGroupingCheckbox = false;
  unreadMessagesOnlyCheckbox = false;

  indexDocCount = 0;

  entireHistoryInProgress = false;

  displayedFolders = new Observable<FolderListEntry[]>();
  selectedFolder = 'Inbox';

  timeOfDay: string;

  conversationSearchText: string;

  openedRowIndex: number;
  selectedRowId: number;
  openedRowId: number;
  searchtextfieldfocused = false;

  showMultipleSearchFields = false;
  showingSearchResults = false; // Toggle if showing from message list or xapian search
  showingWebSocketSearchResults = false;
  displayFolderColumn = false;

  mailViewerOnRightSide = true;
  mailViewerRightSideWidth = '40%';
  allowMailViewerOrientationChange = true;

  buildtimestampstring = BUILD_TIMESTAMP;

  @ViewChild(SingleMailViewerComponent) singlemailviewer: SingleMailViewerComponent;

  @ViewChild(FolderListComponent) folderListComponent: FolderListComponent;
  @ViewChild(CanvasTableContainerComponent, { static: true }) canvastablecontainer: CanvasTableContainerComponent;
  @ViewChild(MatSidenav) sidemenu: MatSidenav;

  hasChildRouterOutlet: boolean;
  canvastable: CanvasTableComponent;

  messagelist: Array<MessageInfo> = [];

  messageActionsHandler: RMM7MessageActions = new RMM7MessageActions();

  dynamicSearchFieldPlaceHolder: string;
  numHistoryChunksProcessed = 0;

  xapianDocCount: number;
  searchResultsCount: number;

  private mobileQueryListener: () => void;

  xapianLoaded = xapianLoadedSubject;

  constructor(public searchService: SearchService,
    public rmmapi: RunboxWebmailAPI,
    public rmm: RMM,
    public snackBar: MatSnackBar,
    public dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    public progressService: ProgressService,
    private mdIconRegistry: MatIconRegistry,
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private renderer: Renderer2,
    private ngZone: NgZone,
    public logoutservice: LogoutService,
    public websocketsearchservice: WebSocketSearchService,
    private draftDeskService: DraftDeskService,
    public messagelistservice: MessageListService,
    changeDetectorRef: ChangeDetectorRef,
    public mobileQuery: MobileQueryService,
    private swPush: SwPush,
    private hotkeysService: HotkeysService
  ) {
    this.hotkeysService.add(
        new Hotkey(['j', 'k'],
        (event: KeyboardEvent, combo: string): ExtendedKeyboardEvent => {
            if (combo === 'k') {
                this.canvastable.scrollUp();
                combo = null;
            }
            if (combo === 'j') {
                this.canvastable.scrollDown();
            }
            const e: ExtendedKeyboardEvent = event;
            e.returnValue = false;
            return e;
        })
    );

    this.mdIconRegistry.addSvgIcon('movetofolder',
    this.sanitizer.bypassSecurityTrustResourceUrl('assets/movetofolder.svg'));

    this.messageActionsHandler.dialog = dialog;
    this.messageActionsHandler.draftDeskService = draftDeskService;
    this.messageActionsHandler.rmmapi = rmmapi;
    this.messageActionsHandler.searchService = searchService;
    this.messageActionsHandler.snackBar = snackBar;

    this.renderer.listen(window, 'keydown', (evt: KeyboardEvent) => {
      if (this.singlemailviewer.messageId) {
        if (evt.code === 'ArrowUp') {
          const newRowIndex = this.openedRowIndex - 1;
          if (newRowIndex >= 0) {
            this.rowSelected(newRowIndex, 3, this.canvastable.rows[newRowIndex], false);
            this.canvastable.scrollUp();
            this.canvastable.hasChanges = true;
            evt.preventDefault();
          }
        } else if (evt.code === 'ArrowDown') {
          const newRowIndex = this.openedRowIndex + 1;
          if (newRowIndex < this.canvastable.rows.length) {
            this.rowSelected(newRowIndex, 3, this.canvastable.rows[newRowIndex], false);
            this.canvastable.scrollDown();
            this.canvastable.hasChanges = true;
            evt.preventDefault();
          }
        }
      }
    });


    this.websocketsearchservice.searchresults.subscribe((results) => {
      if (results === null) {
        if (this.showingWebSocketSearchResults) {
          this.canvastable.columns = this.messagelistservice.getCanvasTableColumns(this);
          this.canvastable.rows = this.messagelist;
          this.showingWebSocketSearchResults = false;
        }
      } else {
        this.canvastable.columns = this.websocketsearchservice.getCanvasTableColumns(this);
        this.canvastable.rows = results;
        this.showingWebSocketSearchResults = true;
      }
    });

    // Mobile media query for screen width

    this.mobileQueryListener = () => {
      // Open sidenav if screen is wide enough and it was closed
      changeDetectorRef.detectChanges();
      if (!this.mobileQuery.matches && !this.sidemenu.opened) {
        this.sidemenu.open();
        const storedMailViewerOrientationSetting = localStorage.getItem(LOCAL_STORAGE_SETTING_MAILVIEWER_ON_RIGHT_SIDE);
        this.mailViewerOnRightSide = !storedMailViewerOrientationSetting || storedMailViewerOrientationSetting === 'true';
        this.allowMailViewerOrientationChange = true;
        this.mailViewerRightSideWidth = '35%';
      } else if (this.mobileQuery.matches && this.sidemenu.opened) {
        this.sidemenu.close();
      }

      if (this.mobileQuery.matches) {
        // #935 - Allow vertical preview also on mobile, and use full width
        this.mailViewerRightSideWidth = '100%';
        this.mailViewerOnRightSide = localStorage
              .getItem(LOCAL_STORAGE_SETTING_MAILVIEWER_ON_RIGHT_SIDE_IF_MOBILE) === `${true}`;
      }
    };

    this.mobileQuery.addListener(this.mobileQueryListener);
    this.updateTime();
  }

  ngOnDestroy() {
    this.mobileQuery.removeListener(this.mobileQueryListener);
  }
  ngDoCheck(): void {
    this.showSelectOperations = Object.keys(this.selectedRowIds).reduce((prev, current) =>
      (this.selectedRowIds[current] ? prev + 1 : prev), 0) > 0;

    if (!this.usewebsocketsearch && this.searchService.api && this.xapianDocCount) {
      this.dynamicSearchFieldPlaceHolder = 'Start typing to search ' +
        this.xapianDocCount
        + ' messages';

      if (this.searchText && this.searchText.length > 2) {
        this.dynamicSearchFieldPlaceHolder += ' (showing ' + this.searchResultsCount + ' hits)';
      }
    } else {
      this.dynamicSearchFieldPlaceHolder = null;
    }
  }

  ngOnInit(): void {
    this.canvastable = this.canvastablecontainer.canvastable;
    this.canvastablecontainer.sortColumn = 2;
    this.canvastablecontainer.sortDescending = true;
    this.resetColumns();

    this.messagelistservice.messagesInViewSubject.subscribe(res => {
      this.messagelist = res;
      if (!this.showingSearchResults && !this.showingWebSocketSearchResults) {
        this.canvastable.rows = this.messagelist;
        this.canvastable.hasChanges = true;
      }
    });

    this.displayedFolders = this.messagelistservice.folderListSubject.pipe(
      map(folders => folders.filter(f => f.folderPath.indexOf('Drafts') !== 0))
    );

    this.canvastable.scrollLimitHit.subscribe((limit) =>
      this.messagelistservice.requestMoreData(limit)
    );

    this.canvastable.canvasResizedSubject.pipe(
        filter(widthChanged => widthChanged === true),
        debounceTime(20)
      ).subscribe(() =>
        this.autoAdjustColumnWidths()
    );

    const contentPreview = localStorage.getItem(LOCAL_STORAGE_SHOWCONTENTPREVIEW);
    if (contentPreview) {
      this.canvastable.showContentTextPreview = contentPreview === 'true';
    }

    const messagePaneSetting = localStorage.getItem(LOCAL_STORAGE_KEEP_PANE);
    if (messagePaneSetting) {
      this.keepMessagePaneOpen = messagePaneSetting === 'true';
    }

    const showUnreadOnly = localStorage.getItem(LOCAL_STORAGE_SHOW_UNREAD_ONLY);
    if (showUnreadOnly) {
      this.unreadMessagesOnlyCheckbox = showUnreadOnly === 'true';
    }

    const viewModeSetting = localStorage.getItem(LOCAL_STORAGE_VIEWMODE);
    if (viewModeSetting) {
      this.viewmode = viewModeSetting;
      this.conversationGroupingCheckbox = this.viewmode === 'conversations';
    }
  }

  ngAfterViewInit() {
    this.searchService.searchResultsSubject.subscribe(() =>
      this.updateSearch(true, true));

    this.searchService.noLocalIndexFoundSubject.subscribe(() => {
      this.messagelistservice.fetchFolderMessages();
      this.promptLocalSearch();
    });

    this.searchService.initSubject.subscribe((res) => {
      this.dataReady = false;
      if (res) {
        setTimeout(() => this.afterLoadIndex(), 0);
      }
    });

    // Start with the sidenav open if window is wide enough
    setTimeout(() => this.mobileQueryListener(), 100);

    this.route.fragment.subscribe(
      fragment => {
        if (!fragment) {
          this.messagelistservice.setCurrentFolder('Inbox');
          this.singlemailviewer.close();
          return;
        }

        const parts = fragment.split(':');
        this.switchToFolder(parts[0]);
        if (parts.length === 2) {
          this.singlemailviewer.messageId = parseInt(parts[1], 10);
        } else {
          this.singlemailviewer.close();
        }
      }
    );

    // Download visible messages in the background
    this.canvastable.repaintDoneSubject.pipe(
        filter(() => !this.canvastable.isScrollInProgress()),
        throttleTime(1000),
        map(() => this.canvastable.getVisibleRowIndexes()),
        mergeMap((rowIndexes) =>
          from(
            rowIndexes
              .filter(ndx => ndx < this.canvastable.rows.length)
              .map(ndx => {
                let messageId: number;
                if (this.showingSearchResults) {
                  messageId = this.searchService.getMessageIdFromDocId(this.canvastable.rows[ndx][0]);
                } else {
                  messageId = this.canvastable.rows[ndx].id;
                }
                return of(messageId);
            })
          ).pipe(
            mergeMap(o =>
              o.pipe(
                mergeMap(messageId => this.rmmapi.getMessageContents(messageId)),
                take(1),
                tap(() => this.canvastable.hasChanges = true)
              ), 1),
            bufferCount(rowIndexes.length)
          )
        )
      )
      .subscribe();

      if ('serviceWorker' in navigator) {
        try  {
          Notification.requestPermission();
        } catch (e) {}
      }

      this.subscribeToNotifications();
  }

  subscribeToNotifications() {
    if (environment.production) {
      this.http.get('/rest/v1/webpush/vapidkeys').pipe(
        map(jwk => exportKeysFromJWK(jwk).public),
        mergeMap(publicKey =>
          from(
            this.swPush.requestSubscription({
              serverPublicKey: publicKey
            })
        )),
        mergeMap(sub => this.http.post('/rest/v1/webpush/subscribe', sub))
      ).subscribe();
    }
  }

  dontShowMessagePane() {
    this.keepMessagePaneOpen = false;
    this.saveMessagePaneSetting();
  }

  public drafts() {
    this.router.navigate(['/compose']);
    setTimeout(() => {
        if (this.mobileQuery.matches && this.sidemenu.opened) {
          this.sidemenu.close();
        }
      }, 0);
  }

  // folder-related stuff: perhaps move to its own service

  createFolder(newFolder: CreateFolderEvent) {
    this.rmmapi.createFolder(
      newFolder.parentId, newFolder.name
    ).subscribe(() => {
      this.messagelistservice.refreshFolderList();
    });
  }

  deleteFolder(folderId: number) {
    this.rmmapi.deleteFolder(folderId).subscribe(
      () => this.messagelistservice.refreshFolderList()
    );
  }

  moveFolder(event: MoveFolderEvent) {
    this.rmmapi.moveFolder(event.sourceId, event.destinationId, event.order).subscribe(
      () => this.messagelistservice.refreshFolderList()
    );
  }

  renameFolder(folder: RenameFolderEvent) {
    this.rmmapi.renameFolder(
      folder.id, folder.name
    ).subscribe(() => {
      this.messagelistservice.refreshFolderList();
    });
  }

  async emptyTrash(trashFolderName: string) {
    console.log('found trash folder with name', trashFolderName);
    const messageLists = await this.rmmapi.listAllMessages(
      0, 0, 0,
      RunboxWebmailAPI.LIST_ALL_MESSAGES_CHUNK_SIZE,
      true, trashFolderName
    ).toPromise();
    await this.rmmapi.trashMessages(messageLists.map(msg => msg.id)).toPromise();
    this.messagelistservice.refreshFolderList();
    console.log('Deleted from', trashFolderName);
  }

  async emptySpam(spamFolderName) {
    console.log('found spam folder with name', spamFolderName);
    const messageLists = await this.rmmapi.listAllMessages(
      0, 0, 0,
      RunboxWebmailAPI.LIST_ALL_MESSAGES_CHUNK_SIZE,
      true, spamFolderName
    ).toPromise();
    await this.rmmapi.trashMessages(messageLists.map(msg => msg.id)).toPromise();
    this.messagelistservice.refreshFolderList();
    console.log('Deleted from', spamFolderName);
  }

  public compose() {
    if (this.mobileQuery.matches && this.sidemenu.opened) {
      this.sidemenu.close();
    }
    this.router.navigate(['/compose'],  {queryParams: {'new': true}});
  }

  saveMessagePaneSetting(): void {
    const setting = this.keepMessagePaneOpen ? 'true' : 'false';
    localStorage.setItem(LOCAL_STORAGE_KEEP_PANE, setting);
  }

  saveContentPreviewSetting(): void {
    const setting = this.canvastable.showContentTextPreview ? 'true' : 'false';
    localStorage.setItem(LOCAL_STORAGE_SHOWCONTENTPREVIEW, setting);
  }

  public trainSpam(params) {
    const msg = params.is_spam ? 'Reporting spam' : 'Reporting not spam';
    const snackBarRef = this.snackBar.open( msg );
    let messageIds = Object.keys(this.selectedRowIds).map((rowid) => parseInt(rowid, 10));

    if (this.showingSearchResults) {
      messageIds = messageIds.map((docId) => this.searchService.getMessageIdFromDocId(docId));
    }
    this.messageActionsHandler.rmmapi.trainSpam({is_spam: params.is_spam, messages: messageIds})
      .subscribe(data => {
        if ( data.status === 'error' ) {
          snackBarRef.dismiss();
          this.snackBar.open('There was an error with Spam functionality. Please select the messages and try again.', 'Dismiss');
        }
        this.searchService.updateIndexWithNewChanges();
        snackBarRef.dismiss();
      }, (err) => {
        console.error('Error reporting spam', err);
        this.snackBar.open('There was an error with Spam functionality.', 'Dismiss');
      },
      () => {
        this.selectedRowIds = {};
        this.selectedRowId = null;
        snackBarRef.dismiss();
      });
  }

  public toggleRead() {
    const snackBarRef = this.snackBar.open('Toggling read status...');
    let messageIds = Object.keys(this.selectedRowIds).map((rowid) => parseInt(rowid, 10));

    if (this.showingSearchResults) {
      messageIds = messageIds.map((docId) => this.searchService.getMessageIdFromDocId(docId));
    }

    from(messageIds.map(mid =>
        this.searchService.rmmapi.getMessageFields(mid)
        .pipe(
            mergeMap((fields) =>
              this.searchService.rmmapi.markSeen(mid,
                fields.seen_flag === 1 ? 0 : 1)
            )
          )
      ))
      .pipe(
        mergeMap(markFlaggedObservable =>
            markFlaggedObservable.pipe(take(1)),
                1 // One at the time (no concurrent flagging operations)
        ),
        bufferCount(messageIds.length)
      )
      .subscribe(() => {
        this.searchService.updateIndexWithNewChanges();
        this.selectedRowIds = {};
        this.selectedRowId = null;
        snackBarRef.dismiss();
      });
  }

  public toggleFlagged() {
    const snackBarRef = this.snackBar.open('Toggling flags...');
    let messageIds = Object.keys(this.selectedRowIds).map((rowid) => parseInt(rowid, 10));

    if (this.showingSearchResults) {
      messageIds = messageIds.map((docId) => this.searchService.getMessageIdFromDocId(docId));
    }

    from(messageIds.map(mid =>
        this.searchService.rmmapi.getMessageFields(mid)
        .pipe(
            mergeMap((fields) =>
              this.searchService.rmmapi.markFlagged(mid,
                fields.flagged_flag === 1 ? 0 : 1)
            )
          )
      ))
      .pipe(
        mergeMap(markFlaggedObservable =>
            markFlaggedObservable.pipe(take(1)),
                1 // One at the time (no concurrent flagging operations)
        ),
        bufferCount(messageIds.length)
      )
      .subscribe(() => {
        this.searchService.updateIndexWithNewChanges();
        this.selectedRowIds = {};
        this.selectedRowId = null;
        snackBarRef.dismiss();
      });
  }

  public trashMessages() {
    let messageIds = Object.keys(this.selectedRowIds).map((rowid) => parseInt(rowid, 10));

    if (this.showingSearchResults) {
      messageIds = messageIds.map((docId) => this.searchService.getMessageIdFromDocId(docId));
    }

    this.searchService.deleteMessages(messageIds);
    this.searchService.rmmapi.trashMessages(messageIds)
      .subscribe(() => {
        this.selectedRowIds = {};
        this.selectedRowId = null;
        if (messageIds.find((id) => id === this.singlemailviewer.messageId)) {
          this.singlemailviewer.close();
        }
      });
  }

  public deleteLocalIndex() {
    this.usewebsocketsearch = true;
    this.canvastable.topindex = 0;
    this.canvastable.rows = [];
    this.viewmode = 'messages';
    this.dataReady = false;
    this.showingSearchResults = false;
    this.searchText = '';

    this.resetColumns();

    this.searchService.deleteLocalIndex().subscribe(() => {
      this.messagelistservice.fetchFolderMessages();

      this.snackBar.open('The index has been deleted from your device', 'Dismiss');
    });
  }

  public isBoldRow(rowObj: any) {
    if (this.showingSearchResults) {
      return this.searchService.getDocData(rowObj[0]).seen ? false : true;
    } else if (this.showingWebSocketSearchResults) {
      return !(rowObj as WebSocketSearchMailRow).seen;
    } else {
      const msg: MessageInfo = rowObj;
      return !msg.seenFlag;
    }
  }

  public isSelectedRow(rowObj: any): boolean {
    let selectedRowId;
    if (this.showingSearchResults) {
      selectedRowId = rowObj[0];
    } else if (this.showingWebSocketSearchResults) {
      selectedRowId = (rowObj as WebSocketSearchMailRow).id;
    } else {
      const msg: MessageInfo = rowObj;
      selectedRowId = msg.id;
    }
    return this.selectedRowIds[selectedRowId] === true;
  }

  public isOpenedRow(rowObj: any): boolean {
    let openedRowId;
    if (this.showingSearchResults) {
      openedRowId = rowObj[0];
    } else {
      const msg: MessageInfo = rowObj;
      openedRowId = msg.id;
    }
    return this.openedRowId === openedRowId;
  }

  public clearSelection() {
    this.selectedRowId = null;
    this.selectedRowIds = {};
  }

  public rowSelected(rowIndex: number, columnIndex: number, rowContent: any, multiSelect?: boolean) {
    if (!rowContent) {
      return;
    }
    let selectedRowId;
    if (this.showingSearchResults) {
      selectedRowId = rowContent[0];
    } else if (this.showingWebSocketSearchResults) {
      selectedRowId = (rowContent as WebSocketSearchMailRow).id;
    } else {
      const msg: MessageInfo = rowContent;
      selectedRowId = msg.id;
    }

    // multiSelect just means do these, nothing else:
    // multiSelect is true if we're applying rowSelect in a loop
    this.selectedRowId = selectedRowId;

    // flip sense of selected row (deleted below if now false)
    if (columnIndex >= -1) {
      this.selectedRowIds[this.selectedRowId] = !this.selectedRowIds[this.selectedRowId];
    }
    if (multiSelect) {
      // MS is a special snowflake:
      this.selectedRowIds[this.selectedRowId] = true;
      return;
    }

    // click anywhere on a row right of the checkbox, reset the selected rows
    // as we want to open the email instead
    if (columnIndex > 0) {
      this.selectedRowIds = {};
    }

    // columnIndex == -1 if drag & drop
    // columnIndex == 0 is the checkbox
    // we're removing this one from the selected list (sense reversed
    // above, but we only remove when not in multiSelect mode)
    if (columnIndex === 0 && !this.selectedRowIds[this.selectedRowId]) {
      this.selectedRowId = null;
      delete this.selectedRowIds[selectedRowId];
    }

    // If we clicked right of the checkbox, we wanted to open the email:
    if (columnIndex > 0) {
      // selectedRow will change when we click on other checkboxes, this one
      // stays attached to the opened email
      this.openedRowId = this.selectedRowId;
      this.openedRowIndex = rowIndex;

      let messageId: number;
      if (this.showingSearchResults) {
        messageId = this.searchService.getMessageIdFromDocId(this.openedRowId);
      } else if (this.showingWebSocketSearchResults) {
        const msg = (rowContent as WebSocketSearchMailRow);
        messageId = msg.id;
      } else {
        const msg: MessageInfo = rowContent;
        messageId = msg.id;
      }

      this.singlemailviewer.messageId = messageId;
      this.updateUrlFragment();

      if (!this.mobileQuery.matches && !localStorage.getItem('messageSubjectDragTipShown')) {
        this.snackBar.open('Tip: Drag subject to a folder to move message(s)' , 'Got it');
        localStorage.setItem('messageSubjectDragTipShown', 'true');
      }
      if (this.viewmode === 'conversations' && rowContent[2] !== '1') {
        this.viewmode = 'singleconversation';
        this.resetColumns();
        this.clearSelection();

        const conversationId =
          this.searchService.api.getStringValue(rowContent[0], 1)
          .replace(/[^0-9A-Z]/g, '_');

        this.conversationSearchText = 'conversation:' + conversationId + '..' + conversationId;
        this.updateSearch(true);
      }
    }
  }

  updateTime() {
    const time = new Date();
    const hour = time.getHours();
    this.timeOfDay = '';
    if (hour >= 4 && hour < 12) {
      this.timeOfDay = 'morning';
    } else if (hour >= 12 && hour < 18) {
      this.timeOfDay = 'afternoon';
    } else if (hour >= 18 && hour < 24) {
      this.timeOfDay = 'evening';
    } else if (hour >= 0 && hour < 4) {
      this.timeOfDay = 'evening';
    }
    setTimeout(() => this.updateTime(), 1000);
  }

  searchFieldKeyUp(text) {
    if (text !== this.searchText) {
      this.searchText = text;
      if (this.usewebsocketsearch) {
        this.websocketsearchservice.search(text);
      } else {
        setTimeout(() =>
          this.updateSearch()
          , 1);
      }
    }
  }

  public afterLoadIndex() {
    this.resetColumns();
    this.dataReady = true;

    this.showingWebSocketSearchResults = false;
    this.usewebsocketsearch = false;

    this.updateSearch(true);

  }

  public downloadIndexFromServer() {
    this.searchService.downloadIndexFromServer().subscribe((res) => {
      if (res) {
        this.afterLoadIndex();
        this.searchService.downloadPartitions().subscribe();
      } else {

      }
    });
  }

  singleMailViewerClosed(action: string): void {
    this.openedRowId = null;
    this.updateUrlFragment();
  }

  searchTextFieldFocus() {
    if (!this.usewebsocketsearch && !this.dataReady) {
      this.usewebsocketsearch = true;
    } else {
      this.searchtextfieldfocused = true;

      if (this.usewebsocketsearch) {
        this.websocketsearchservice.open();
      }
    }
  }

  searchTextFieldBlur() {
    this.searchtextfieldfocused = false;

    if (this.websocketsearchservice.websocket) {
      this.websocketsearchservice.close();
    }
  }

  dropToFolder(folderId): void {
    let messageIds = Object.keys(this.selectedRowIds).map(id =>
      parseInt(id, 10));

    if (this.showingSearchResults) {
      messageIds = messageIds.map((docId) => this.searchService.getMessageIdFromDocId(docId));
      this.messagelistservice.folderListSubject.subscribe(folders => {
        const folderPath = folders.find(fld => fld.folderId === folderId).folderPath;
        this.searchService.moveMessagesToFolder(messageIds, folderPath);
      });
    } else {
      ProgressDialog.open(this.dialog);
    }

    this.rmmapi.moveToFolder(messageIds
      , folderId).subscribe(() => {
        this.searchService.updateIndexWithNewChanges();
        this.selectedRowIds = {};
        this.selectedRowId = null;
        this.openedRowId = null;
        ProgressDialog.close();
      });
  }

  public moveToFolder() {
    const dialogRef: MatDialogRef<MoveMessageDialogComponent> = this.dialog.open(MoveMessageDialogComponent);
    let messageIds = Object.keys(this.selectedRowIds).map(id =>
      parseInt(id, 10));
    if (this.showingSearchResults) {
      messageIds = messageIds.map((docId) => this.searchService.getMessageIdFromDocId(docId));
    }

    console.log('selected messages', messageIds);
    dialogRef.componentInstance.selectedMessageIds = messageIds;
    dialogRef.afterClosed().subscribe(folder => {
      if (folder) {
        this.searchService.updateIndexWithNewChanges();
        this.selectedRowIds = {};
        this.selectedRowId = null;
        this.openedRowId = null;
      }
    });
  }

  updateViewMode(viewmode) {
    if (this.viewmode !== viewmode) {
      this.viewmode = viewmode;
      localStorage.setItem(LOCAL_STORAGE_VIEWMODE, this.viewmode);
      if (viewmode !== 'singleconversation') {
        this.conversationSearchText = null;
      }
      this.resetColumns();
      this.updateSearch(true);
    }
  }

  selectFolder(folder: string): void {
    if (this.mobileQuery.matches && this.sidemenu.opened) {
      this.sidemenu.close();
    }
    this.singlemailviewer.close();
    this.switchToFolder(folder);
    this.updateUrlFragment();
  }

  private switchToFolder(folder: string): void {
    let doResetColumns = false;
    if (folder !== this.selectedFolder) {
      this.clearSelection();
      if (folder.startsWith('Sent') || this.selectedFolder.startsWith('Sent')) {
        doResetColumns = true;
      }
    }
    this.selectedFolder = folder;

    this.messagelistservice.messagesInViewSubject
      .pipe(
        skip(1),
        take(1)
      ).subscribe(() =>
        // Reset columns after folder list is updated
        this.resetColumns()
      );
    this.messagelistservice.setCurrentFolder(folder);

    if (this.viewmode === 'singleconversation') {
      this.viewmode = 'conversations';
      this.conversationSearchText = undefined;
      doResetColumns = true;
    }

    if (this.hasChildRouterOutlet) {
      this.router.navigate(['/']);
    }

    setTimeout(() => {
        if (doResetColumns) {
          this.resetColumns();
        }
        this.updateSearch(true);
        this.canvastable.scrollTop();
      }, 0);
  }

  convertFolderPath(str) {
    return '/' + str.replace(/\./g, '/');
  }

  resetColumns() {
    if (this.showingSearchResults) {
      this.canvastable.columns = this.searchService.getCanvasTableColumns(this);
    } else if (this.showingWebSocketSearchResults) {
      this.canvastable.columns = this.websocketsearchservice.getCanvasTableColumns(this);
    } else {
      this.canvastable.columns = this.messagelistservice.getCanvasTableColumns(this);
    }
    this.canvastable.rowWrapModeWrapColumn = 3;
    this.canvastable.rowWrapModeDefaultSelectedColumn = 3;
    this.autoAdjustColumnWidths();
  }

  updateSearch(always?: boolean, noscroll?: boolean) {
    if (!this.dataReady || this.showingWebSocketSearchResults) {
      return;
    }
    const setting = this.unreadMessagesOnlyCheckbox ? 'true' : 'false';
    localStorage.setItem(LOCAL_STORAGE_SHOW_UNREAD_ONLY, setting);

    if (always || this.lastSearchText !== this.searchText) {
      this.lastSearchText = this.searchText;

      console.log('us', this.usewebsocketsearch);
      if (
        this.usewebsocketsearch ||
        this.selectedFolder === this.messagelistservice.spamFolderName ||
        this.selectedFolder === this.messagelistservice.trashFolderName
      ) {
        /*
         * Message table from database, shown if local search index is not present
         */
        if (this.showingSearchResults) {
          this.showingSearchResults = false;
          this.resetColumns();
        }

        this.canvastable.rows = this.messagelist;

        return;
      } else {
        this.indexDocCount = this.searchService.api.getXapianDocCount();

        if (this.viewmode === 'singleconversation') {
          this.searchService.api.setStringValueRange(1, 'conversation:');
        } else {
          this.searchService.api.clearValueRange();
        }

        // const startTime = new Date().getTime();
        let querytext = '';
        switch (this.viewmode) {
          case 'singleconversation':
            querytext += this.conversationSearchText + ' ';
            break;
          case 'conversations':
          default:
            if (this.searchText.length < 3) {
              // Expand to all folders if search text length is longer than 3 characters
              querytext += this.searchService.getFolderQuery(querytext, this.selectedFolder, this.unreadMessagesOnlyCheckbox);
            }
        }
        const previousDisplayFolderColumn = this.displayFolderColumn;
        if (this.searchText.length >= 3 || this.viewmode === 'singleconversation') {
          // Require at least 3 chars in searchtext
          querytext += this.searchText;
          this.displayFolderColumn = true;
        } else {
          this.displayFolderColumn = false;
        }

        if (!this.showingSearchResults ||
          this.displayFolderColumn !== previousDisplayFolderColumn) {
          this.showingSearchResults = true;
          this.resetColumns();
        }

        console.log(querytext);
        try {
          let searchResults = null;

          this.ngZone.runOutsideAngular(() => {
            searchResults = this.searchService.api.sortedXapianQuery(
              querytext,
              this.canvastablecontainer.sortColumn,
              this.canvastablecontainer.sortDescending ? 1 : 0, 0, 50000,
              this.viewmode === 'conversations' ? 1 : -1
            );
          });
          // console.log("Search time: "+(new Date().getTime()-startTime));
          // console.log(searchResults.length);

          this.xapianDocCount = this.searchService.api.getXapianDocCount();
          this.searchResultsCount = searchResults.length;
          if (searchResults) {
            this.canvastable.rows = searchResults;
            if (!noscroll) {
              this.canvastable.scrollTop();
            }
          }
        } catch (e) { }

      }
    }
  }

  mailViewerOrientationChangeRequest(orientation: string) {
    const currentMessageId = this.singlemailviewer.messageId;
    if (orientation === 'vertical') {
      this.mailViewerOnRightSide = true;
    } else {
      this.mailViewerOnRightSide = false;
    }
    if (this.mobileQuery.matches) {
      localStorage.setItem(LOCAL_STORAGE_SETTING_MAILVIEWER_ON_RIGHT_SIDE_IF_MOBILE,
          `${this.mailViewerOnRightSide}`);
    }
    localStorage.setItem(LOCAL_STORAGE_SETTING_MAILVIEWER_ON_RIGHT_SIDE, this.mailViewerOnRightSide ? 'true' : 'false');
    // Reopen message on orientation change
    setTimeout(() => this.singlemailviewer.messageId = currentMessageId, 0);
  }

  horizScroll(evt: any) {
    this.canvastable.horizScroll = evt.target.scrollLeft;
  }

  autoAdjustColumnWidths() {
    setTimeout(() =>
      this.canvastable.autoAdjustColumnWidths(40, true), 0
    );
  }

  promptLocalSearch() {
    let localSearchIndexPromptItemName: string;
    console.log('promptLocalSearch');
    this.rmmapi.me.pipe(
      map(me => localSearchIndexPromptItemName = 'localSearchPromptDisplayed' + me.uid),
      mergeMap(() => xapianLoadedSubject),
      tap(xapianLoaded => {
        if (!xapianLoaded) {
          this.usewebsocketsearch = true;
        }
      }),
      filter(xapianLoaded => xapianLoaded ? true : false),
      map(() => {
        if (localStorage.getItem(localSearchIndexPromptItemName) === 'true') {
          this.usewebsocketsearch = true;
        } else {
          const dialogRef = this.dialog.open(ConfirmDialog);
          dialogRef.componentInstance.title = 'Welcome to Runbox 7!';
          dialogRef.componentInstance.question =
            `Runbox 7 will now synchronize with your device to give you an optimal webmail experience.
            If you'd later like to remove the data from your device, use the synchronization controls at the bottom of the folder pane.`;
          dialogRef.componentInstance.yesOptionTitle = `Sounds good, let's go!`;
          dialogRef.componentInstance.noOptionTitle = `Don't synchronize with this device.`;
          localStorage.setItem(localSearchIndexPromptItemName, 'true');

          dialogRef.afterClosed().subscribe(res => {
            if (res) {
              this.downloadIndexFromServer();
            } else {
              this.usewebsocketsearch = true;
            }
          });
        }
      })
    ).subscribe();
  }

  private updateUrlFragment(): void {
    if (this.router.url.match('^/[^#]')) {
      // we're not actually on mailviewer, so don't try to be smart
      return;
    }
    let fragment = this.messagelistservice.currentFolder;
    if (this.singlemailviewer.messageId) {
      fragment += `:${this.singlemailviewer.messageId}`;
    }
    this.router.navigate(['/'], { fragment });
  }
}

// vim: set shiftwidth=2
