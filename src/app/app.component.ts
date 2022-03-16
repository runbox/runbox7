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

import { AfterViewInit, Component, DoCheck, NgZone, OnInit, ViewChild, Renderer2, ChangeDetectorRef } from '@angular/core';
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
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { MessageListService } from './rmmapi/messagelist.service';
import { MessageInfo } from './common/messageinfo';
import { MessageList } from './common/messagelist';
import { RunboxWebmailAPI, FolderListEntry, MessageFlagChange } from './rmmapi/rbwebmail';
import { DraftDeskService } from './compose/draftdesk.service';
import { RMM7MessageActions } from './mailviewer/rmm7messageactions';
import { FolderListComponent, CreateFolderEvent, RenameFolderEvent, MoveFolderEvent } from './folder/folder.module';
import { SimpleInputDialog, SimpleInputDialogParams } from './dialog/dialog.module';
import { map, take, skip, mergeMap, filter, tap, throttleTime, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ConfirmDialog } from './dialog/confirmdialog.component';
import { WebSocketSearchService } from './websocketsearch/websocketsearch.service';
import { WebSocketSearchMailList } from './websocketsearch/websocketsearchmaillist';

import { BUILD_TIMESTAMP } from './buildtimestamp';
import { from, Observable } from 'rxjs';
import { xapianLoadedSubject } from './xapian/xapianwebloader';
import { SwPush } from '@angular/service-worker';
import { exportKeysFromJWK } from './webpush/vapid.tools';
import { MobileQueryService, ScreenSize } from './mobile-query.service';
import { ProgressService } from './http/progress.service';
import { RMM } from './rmm';
import { environment } from '../environments/environment';
import { LogoutService } from './login/logout.service';
import { Hotkey, HotkeysService } from 'angular2-hotkeys';
import { AppSettings, AppSettingsService } from './app-settings';
import { SavedSearchesService } from './saved-searches/saved-searches.service';
import { SearchMessageDisplay } from './xapian/searchmessagedisplay';
import { UsageReportsService } from './common/usage-reports.service';

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
  styleUrls: ['app.component.scss'],
  templateUrl: 'app.component.html'
})
export class AppComponent implements OnInit, AfterViewInit, CanvasTableSelectListener, DoCheck {
  showSelectOperations: boolean;
  showSelectMarkOpMenu: boolean;

  lastSearchText = '';
  searchText = '';
  dataReady = false;

  usewebsocketsearch = false;

  viewmode = 'messages';
  keepMessagePaneOpen = true;
  conversationGroupingCheckbox = false;
  conversationGroupingToolTip = 'Threaded conversation view';
  unreadMessagesOnlyCheckbox = false;
  unreadOnlyToolTip = 'Unread messages only';

  indexDocCount = 0;

  entireHistoryInProgress = false;

  displayedFolders = new Observable<FolderListEntry[]>();
  selectedFolder = 'Inbox';
  composeSelected: boolean;
  draftsSelected: boolean;
  overviewSelected: boolean;

  timeOfDay: string;

  conversationSearchText: string;
  searchtextfieldfocused = false;

  showMultipleSearchFields = false;
  showingSearchResults = false; // Toggle if showing from message list or xapian search
  showingWebSocketSearchResults = false;
  displayFolderColumn = false;

  mailViewerOnRightSide = true;
  mailViewerRightSideWidth = '40%';
  allowMailViewerOrientationChange = true;

  AvatarSource = AppSettings.AvatarSource; // makes enum visible in template

  buildtimestampstring = BUILD_TIMESTAMP;

  @ViewChild(SingleMailViewerComponent) singlemailviewer: SingleMailViewerComponent;

  @ViewChild(FolderListComponent) folderListComponent: FolderListComponent;
  @ViewChild(CanvasTableContainerComponent, { static: true }) canvastablecontainer: CanvasTableContainerComponent;
  @ViewChild(MatSidenav) sidemenu: MatSidenav;

  sideMenuOpened = true;

  hasChildRouterOutlet = false;
  canvastable: CanvasTableComponent;

  fragment: string;
  jumpToFragment = false;

  messagelist: Array<MessageInfo> = [];

  messageActionsHandler: RMM7MessageActions = new RMM7MessageActions();

  dynamicSearchFieldPlaceHolder: string;
  numHistoryChunksProcessed = 0;

  xapianDocCount: number;
  searchResultsCount: number;

  experimentalFeatureEnabled = false;

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
    public draftDeskService: DraftDeskService,
    public messagelistservice: MessageListService,
    changeDetectorRef: ChangeDetectorRef,
    public mobileQuery: MobileQueryService,
    private swPush: SwPush,
    private hotkeysService: HotkeysService,
    public settingsService: AppSettingsService,
    private savedSearchService: SavedSearchesService,
    private usage: UsageReportsService,
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
    this.hotkeysService.add(
        new Hotkey(
            'up up down down left right left right b a',
            (event: KeyboardEvent): ExtendedKeyboardEvent => {
                this.router.navigateByUrl('/onscreen');
                this.snackBar.open('Enjoy the video call prototype!', 'Thanks!', { duration: 3000 });
                this.experimentalFeatureEnabled = true;
                localStorage.setItem('rmm7experimentalFeatureEnabled', 'true');
                const e: ExtendedKeyboardEvent = event;
                e.returnValue = false;
                return e;
            }
        ),
    );

    if (localStorage.getItem('rmm7experimentalFeatureEnabled') === 'true') {
        this.experimentalFeatureEnabled = true;
    }

    this.mdIconRegistry.addSvgIcon('movetofolder',
    this.sanitizer.bypassSecurityTrustResourceUrl('assets/movetofolder.svg'));

    this.messageActionsHandler.dialog = dialog;
    this.messageActionsHandler.draftDeskService = draftDeskService;
    this.messageActionsHandler.rmmapi = rmmapi;
    this.messageActionsHandler.searchService = searchService;
    this.messageActionsHandler.messageListService = messagelistservice;
    this.messageActionsHandler.snackBar = snackBar;

    this.renderer.listen(window, 'keydown', (evt: KeyboardEvent) => {
      if (this.singlemailviewer.messageId) {
        if (evt.code === 'ArrowUp') {
          // slightly ugly as we need to call *this* rowSelected, not
          // the cvtable one
          const newRowIndex = this.canvastable.rows.openedRowIndex - 1;
          if (newRowIndex >= 0) {
            this.rowSelected(newRowIndex, 3, false);
            this.canvastable.scrollUp();
            this.canvastable.hasChanges = true;
            evt.preventDefault();
          }
        } else if (evt.code === 'ArrowDown') {
          // slightly ugly as we need to call *this* rowSelected, not
          // the cvtable one
          const newRowIndex = this.canvastable.rows.openedRowIndex + 1;
          if (newRowIndex < this.canvastable.rows.rowCount()) {
            this.rowSelected(newRowIndex, 3, false);
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
          this.setMessageDisplay('messagelist', this.messagelist);
          this.showingWebSocketSearchResults = false;
        }
      } else {
        this.setMessageDisplay('websocketlist', results);
        this.showingWebSocketSearchResults = true;
      }
      this.resetColumns();
    });

    this.sideMenuOpened = (mobileQuery.screenSize === ScreenSize.Desktop ? true : false);
    const storedMailViewerOrientationSettingMobile = localStorage.getItem(LOCAL_STORAGE_SETTING_MAILVIEWER_ON_RIGHT_SIDE);

    if (mobileQuery.screenSize !== ScreenSize.Desktop) {
      if (storedMailViewerOrientationSettingMobile) {
        this.mailViewerOnRightSide = (storedMailViewerOrientationSettingMobile === 'false' ? false : true);
      } else {
        this.mailViewerOnRightSide = false;
      }
    }

    mobileQuery.screenSizeChanged.subscribe(size => {
      this.sideMenuOpened = (size === ScreenSize.Desktop ? true : false);
      changeDetectorRef.detectChanges();

      if (this.sideMenuOpened) {
        const storedMailViewerOrientationSetting = localStorage.getItem(LOCAL_STORAGE_SETTING_MAILVIEWER_ON_RIGHT_SIDE);
        this.mailViewerOnRightSide = !storedMailViewerOrientationSetting || storedMailViewerOrientationSetting === 'true';
        this.allowMailViewerOrientationChange = true;
        this.mailViewerRightSideWidth = '35%';
      }

      if (size !== ScreenSize.Desktop) {
        // #935 - Allow vertical preview also on mobile, and use full width
        this.mailViewerRightSideWidth = '100%';
        this.mailViewerOnRightSide = localStorage
              .getItem(LOCAL_STORAGE_SETTING_MAILVIEWER_ON_RIGHT_SIDE_IF_MOBILE) === `${true}`;
      }
      console.log(this.mailViewerOnRightSide);
    });

    this.updateTime();
  }

  public get canvasTableBtmOffset() {
    return this.singlemailviewer && this.singlemailviewer.adjustableHeight
      ? this.singlemailviewer.resizerHeight
      : 0;
  }

  ngDoCheck(): void {
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
      if (!this.showingSearchResults && !this.showingWebSocketSearchResults
         && res && res.length > 0) {
        this.setMessageDisplay('messagelist', this.messagelist);
        if (this.jumpToFragment) {
          this.selectMessageFromFragment(this.fragment);
          this.canvastable.jumpToOpenMessage();
          this.jumpToFragment = false;
        }
        this.canvastable.hasChanges = true;
      }
    });

    // Only update if actual changes found (else folderlist redraw takes 3sec or more)
    this.displayedFolders =
      this.messagelistservice.folderListSubject
        .pipe(distinctUntilChanged((prev: FolderListEntry[], curr: FolderListEntry[]) => {
          return prev.length === curr.length
            && prev.every((f, index) =>
              f.folderId === curr[index].folderId
              && f.totalMessages === curr[index].totalMessages
              && f.newMessages === curr[index].newMessages);
        }))
        .pipe(map((folders: FolderListEntry[]) => folders.filter(f => f.folderPath.indexOf('Drafts') !== 0))
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

    const mailViewerSetting = localStorage.getItem(LOCAL_STORAGE_SETTING_MAILVIEWER_ON_RIGHT_SIDE);
    if (mailViewerSetting) {
      this.mailViewerOnRightSide = mailViewerSetting === 'true';
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

    this.route.fragment.subscribe(
      fragment => {
        if (!fragment) {
          // This also runs when we load '/compose' .. but doesnt need to
          this.messagelistservice.setCurrentFolder('Inbox');
          if (this.singlemailviewer) {
            this.singlemailviewer.close();
          }
          this.fragment = '';
          return;
        }

        if (fragment !== this.fragment) {
          this.fragment = fragment;
          if (this.canvastable.rows) {
            this.selectMessageFromFragment(this.fragment);
            this.canvastable.jumpToOpenMessage();
          } else {
            this.jumpToFragment = true;
          }
        }
      }
    );

  }

  ngAfterViewInit() {
    this.searchService.indexUpdatedSubject.subscribe(() => {
      console.log('Redrawing after search results update');
      this.afterUpdateIndex();
    });

    this.searchService.noLocalIndexFoundSubject.subscribe(() => {
      this.messagelistservice.fetchFolderMessages();
      this.promptLocalSearch();
    });

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.composeSelected = this.router.url === '/compose?new=true';
      this.draftsSelected = this.router.url === '/compose';
      this.overviewSelected = this.router.url === '/overview';
    });

    // Download visible messages in the background
    this.canvastable.repaintDoneSubject.pipe(
        filter(() => !this.canvastable.isScrollInProgress()),
        throttleTime(1000)
    ).subscribe(() => {
        const rowIndexes = this.canvastable.getVisibleRowIndexes();
        const messageIds = rowIndexes.filter(
            idx => idx < this.canvastable.rows.rowCount()
        ).map(idx => this.canvastable.rows.getRowMessageId(idx));
        for (const id of messageIds) {
          if (this.searchService.updateMessageText(id)) {
            this.canvastable.hasChanges = true;
          }
        }
    });

      if ('serviceWorker' in navigator) {
        try  {
          Notification.requestPermission();
        } catch (e) {}
      }

      this.subscribeToNotifications();
  }

  selectMessageFromFragment(fragment: string): void {
    const fragmentTarget = this.parseFragment(fragment);
    if (fragmentTarget) {
      const [folder, msgId] = fragmentTarget;
      this.switchToFolder(folder);
      if (msgId === null) {
        if (this.singlemailviewer) {
          this.singlemailviewer.close();
        }
      }
      if (msgId != null && this.singlemailviewer && this.singlemailviewer.messageId !== msgId) {
        this.selectRowByMessageId(msgId);
      }
    }
  }

  parseFragment(fragment: string): [string, number] {
    if (!fragment) {
      return null;
    }
    const parts = fragment.split(':');
    if (parts.length === 2) {
      return [parts[0], parseInt(parts[1], 10)];
    }
    return [fragment, null];
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

  public overview() {
    this.router.navigate(['/overview']);
    setTimeout(() => {
        if (this.mobileQuery.matches && this.sidemenu.opened) {
          this.sidemenu.close();
        }
      }, 0);
  }

  renameFolder(folder: RenameFolderEvent) {
    this.rmmapi.renameFolder(
      folder.id, folder.name
    ).subscribe(() => {
      this.messagelistservice.refreshFolderList();
    });
  }

  // Folder count values are displayed from messagelistservice folderListSubject
  // (this.displayedFolders)
  // contents of trash folder from folderMessageList, so update those first
  async emptyTrash(trashFolder: FolderListEntry) {
    console.log('found trash folder with name', trashFolder.folderName);

    this.messageActionsHandler.updateMessages({
      messageIds: [],
      updateLocal: (msgIds: number[]) => {
        this.messagelistservice.pretendEmptyTrash();
      },
      updateRemote: (msgIds: number[]): Observable<any> =>
        this.rmmapi.emptyFolder(trashFolder.folderId)
    });

    console.log('Deleted from', trashFolder.folderName);
  }

  async emptySpam(spamFolderName) {
    console.log('found spam folder with name', spamFolderName);
    const messageLists = await this.rmmapi.listAllMessages(
      0, 0, 0,
      RunboxWebmailAPI.LIST_ALL_MESSAGES_CHUNK_SIZE,
      true, spamFolderName
    ).toPromise();

    const messageIds = messageLists.map(msg => msg.id);
    this.messageActionsHandler.updateMessages({
      messageIds: messageIds,
      updateLocal: (msgIds: number[]) => this.messagelistservice.moveMessages(msgIds, this.messagelistservice.trashFolderName),
      updateRemote: (msgIds: number[]) =>
        this.rmmapi.deleteMessages(msgIds)
    });

    console.log('Deleted from', spamFolderName);
  }

  public compose() {
    if (this.mobileQuery.matches && this.sidemenu.opened) {
      this.sidemenu.close();
    }
    this.router.navigate(['/compose'],  {queryParams: {'new': true}});
  }

  async composeBugReport() {
    if (this.mobileQuery.matches && this.sidemenu.opened) {
      this.sidemenu.close();
    }
    // Create pre-filled draft email, setting some of the values
    await this.draftDeskService.newBugReport(
      this.searchService.localSearchActivated,
      this.keepMessagePaneOpen,
      this.canvastable.showContentTextPreview,
      this.mailViewerOnRightSide,
      this.unreadMessagesOnlyCheckbox,
      this.mobileQuery.matches
    );
    this.router.navigate(['/compose'], {fragment: 'bug-report'});
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
    const messageIds = this.canvastable.rows.selectedMessageIds();

    this.messageActionsHandler.updateMessages({
      messageIds: messageIds,
      updateLocal: (msgIds: number[]) => {
        // Move to spam folder (delete from index), set spam flag
        if (params.is_spam) {
          // remove from message display
          this.canvastable.rows.removeMessages(messageIds);
          this.searchService.deleteMessages(msgIds);
          this.messagelistservice.moveMessages(msgIds, this.messagelistservice.spamFolderName, true);
        } else {
          // move back to inbox
          if (this.searchService.localSearchActivated) {
            msgIds.forEach((msgId) => {
              const msgInfo = this.messagelistservice.messagesById[msgId];
              this.searchService.indexingTools.addMessageToIndex(msgInfo);
            });
          }
          // FIXME: constant for "inbox"?
          this.messagelistservice.moveMessages(msgIds, 'Inbox', true);
        }
        this.clearSelection();
        if (messageIds.find((id) => id === this.singlemailviewer.messageId)) {
          this.singlemailviewer.close();
        }
      },
      updateRemote: (msgIds: number[]) => {
        const userFolders = this.messagelistservice.folderListSubject.value;
        const currentFolderId = userFolders.find(fld => fld.folderPath === this.messagelistservice.currentFolder).folderId;
        const res = this.rmmapi.trainSpam({is_spam: params.is_spam, from_folder_id: currentFolderId, messages: messageIds});
        res.subscribe(data => {
          if ( data.status === 'error' ) {
            snackBarRef.dismiss();
            this.snackBar.open('There was an error with Spam functionality. Please select the messages and try again.', 'Dismiss');
          }
          snackBarRef.dismiss();
        }, (err) => {
          console.error('Error reporting spam', err);
          this.snackBar.open('There was an error with Spam functionality.', 'Dismiss');
        },
       () => {
         snackBarRef.dismiss();
       });
        return res;
      }
    });
  }

  public openMarkOpMenu() {
    this.showSelectMarkOpMenu = true;
  }

  public closeMarkOpMenu() {
    this.showSelectMarkOpMenu = false;
  }

  public setReadStatus(status: boolean) {
    const snackBarRef = this.snackBar.open('Toggling read status...');
    const messageIds = this.canvastable.rows.selectedMessageIds();

    this.messageActionsHandler.updateMessages({
      messageIds: messageIds,
      updateLocal: (msgIds: number[]) => {
        msgIds.forEach( (id) => {
          // Updates both index + messagelist
          this.rmmapi.messageFlagChangeSubject.next(
            new MessageFlagChange(id, status, null)
          );
        });
        this.clearSelection();
        if (this.singlemailviewer && messageIds.find((id) => id === this.singlemailviewer.messageId)) {
          this.singlemailviewer.mailObj.seen_flag = status ? 1 : 0;
        }
      },
      updateRemote: (msgIds: number[]) =>
        this.rmm.email.update({
          flag: {
            name: 'seen_flag',
            value: status ? 1 : 0,
          },
          ids: msgIds
        })
      ,
      afterwards: (result) => {
        snackBarRef.dismiss();
      }
    });
  }

  public setFlaggedStatus(status: boolean) {
    const snackBarRef = this.snackBar.open('Toggling flags...');
    const messageIds = this.canvastable.rows.selectedMessageIds();

    this.messageActionsHandler.updateMessages({
      messageIds: messageIds,
      updateLocal: (msgIds: number[]) => {
        msgIds.forEach( (id) => {
          // Updates both index + messagelist
          this.rmmapi.messageFlagChangeSubject.next(
            new MessageFlagChange(id, null, status)
          );
        });
        this.clearSelection();
        if (this.singlemailviewer && messageIds.find((id) => id === this.singlemailviewer.messageId)) {
          this.singlemailviewer.mailObj.flagged_flag = status ? 1 : 0;
        }
      },
      updateRemote: (msgIds: number[]) =>
        this.rmm.email.update({
          flag: {
            name: 'flagged_flag',
            value: status ? 1 : 0,
          },
          ids: msgIds
        })
      ,
      afterwards: (result) => {
        snackBarRef.dismiss();
      }
    });
  }

  // Delete selected messages in current canvastable view
  // If looking at Trash, this will be "delete permanently"
  public deleteMessages() {
    const messageIds = this.canvastable.rows.selectedMessageIds();

    this.messageActionsHandler.updateMessages({
      messageIds: messageIds,
      updateLocal: (msgIds: number[]) => {
        // remove from message display
        this.canvastable.rows.removeMessages(messageIds);
        this.searchService.deleteMessages(msgIds);
        if (this.selectedFolder === this.messagelistservice.trashFolderName) {
          this.messagelistservice.deleteTrashMessages(msgIds);
        } else {
          this.messagelistservice.moveMessages(msgIds, this.messagelistservice.trashFolderName);
        }
        this.clearSelection();
        if (this.singlemailviewer && this.singlemailviewer.messageId && msgIds.includes(this.singlemailviewer.messageId)) {
          this.singlemailviewer.close();
        }
      },
      updateRemote: (msgIds: number[]) => this.rmmapi.deleteMessages(msgIds)
    });
  }

  public deleteLocalIndex() {
    this.usewebsocketsearch = true;
    this.canvastable.topindex = 0;
    this.canvastable.rows = null;
    this.viewmode = 'messages';
    this.dataReady = false;
    this.showingSearchResults = false;
    this.searchText = '';

    this.resetColumns();

    this.usage.report('local-index-deleted');

    this.searchService.deleteLocalIndex().subscribe(() => {
      this.messagelistservice.fetchFolderMessages();

      this.updateTooltips();
      this.snackBar.open('The index has been deleted from your device', 'Dismiss');
    });
  }

  public setMessageDisplay(displayType: string, ...args) {
    if (displayType === 'search') {
      if (this.canvastable.rows instanceof SearchMessageDisplay) {
        this.canvastable.updateRows(args[1]);
      } else {
        this.canvastable.rows = new SearchMessageDisplay(...args);
      }
    }
    if (displayType === 'messagelist') {
      if (this.canvastable.rows instanceof MessageList) {
        this.canvastable.updateRows(args[0]);
      } else {
        this.canvastable.rows = new MessageList(...args);
      }
    }
    if (displayType === 'websocketlist') {
      if (this.canvastable.rows instanceof WebSocketSearchMailList) {
        this.canvastable.updateRows(args[0]);
      } else {
        this.canvastable.rows = new WebSocketSearchMailList(...args);
      }
    }
    this.filterMessageDisplay();

    // FIXME: looks weird, should probably rename "rows" to "messagedisplay"
    // in canvastable, and anyway get CV to just read the columns itself
    // "this" so we can check selectedFolder (FIXME: improve!)
    // parts like app.selectedFolder.indexOf('Sent') === 0 etc are
    // why we have resetColumns scattered everywhere, if canvas just called getCTC whenever it did a paint, we wouldnt need to?
    // would that slow things down?
    // NB this triggers hasChanged for us and forces a redraw
    this.canvastable.columns =  this.canvastable.rows.getCanvasTableColumns(this);

    // messages updated, check if we need to select a message from the fragment
    this.selectMessageFromFragment(this.fragment);
  }

  public filterMessageDisplay() {
    if (this.canvastable.rows) {
      const options = new Map();
      options.set('unreadOnly', this.unreadMessagesOnlyCheckbox);
      options.set('searchText', this.searchText);
      this.canvastable.rows.filterBy(options);
      this.canvastable.hasChanges = true;
    }
  }

  public clearSelection() {
    if (this.canvastable.rows) {
      this.canvastable.rows.clearSelection();
    }
    this.canvastable.hasChanges = true;
    this.showSelectOperations = false;
    this.showSelectMarkOpMenu = false;
  }

  public selectRowByMessageId(messageId: number) {
    const matchingRowIndex = this.canvastable.rows.findRowByMessageId(messageId);
    if (matchingRowIndex >= -1) {
      this.rowSelected(matchingRowIndex, 1, false);
    } else {
      this.singlemailviewer.close();
    }
  }

  public rowSelected(rowIndex: number, columnIndex: number, multiSelect?: boolean) {
    this.canvastable.rows.rowSelected(rowIndex, columnIndex, multiSelect);
    this.showSelectOperations = this.canvastable.rows.anySelected();

    if (this.canvastable.rows.hasChanges) {
      this.updateUrlFragment(this.canvastable.rows.getRowMessageId(rowIndex));
      this.singlemailviewer.messageId = this.canvastable.rows.getRowMessageId(rowIndex);

      if (!this.mobileQuery.matches && !localStorage.getItem('messageSubjectDragTipShown')) {
        this.snackBar.open('Tip: Drag subject to a folder to move message(s)' , 'Got it');
        localStorage.setItem('messageSubjectDragTipShown', 'true');
      }
      // FIXME: [2] is searchservice specific!
      if (this.viewmode === 'conversations' && this.canvastable.rows.getCurrentRow()[2] !== '1') {
        this.viewmode = 'singleconversation';
        this.resetColumns();
        this.clearSelection();

        // FIXME [0] is searchservice specific!
        const conversationId =
          this.searchService.api.getStringValue(this.canvastable.rows.getCurrentRow()[0], 1)
          .replace(/[^0-9A-Z]/g, '_');

        this.conversationSearchText = 'conversation:' + conversationId + '..' + conversationId;
        this.updateSearch(true);
      }

      this.canvastable.hasChanges = true;
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

  searchFor(text) {
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

  public afterUpdateIndex() {
    this.dataReady = true;

    this.showingWebSocketSearchResults = false;
    this.usewebsocketsearch = false;

    // don't scroll to top when redrawing after index updates
    this.updateSearch(true, true);

  }

  public childRouteActivated(yes: boolean): void {
    this.hasChildRouterOutlet = yes;
    if (yes) {
      this.selectedFolder = null;
    } else {
      // reset the default Folder
      this.selectedFolder = 'Inbox';
    }
  }

  public downloadIndexFromServer() {
    this.searchService.downloadIndexFromServer().subscribe((res) => {
      if (res) {
        this.searchService.downloadPartitions().subscribe();
      } else {
        console.log('Index download failed');
      }
    });
  }

  singleMailViewerClosed(action: string): void {
    this.canvastable.rows.clearOpenedRow();
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
    const messageIds = this.canvastable.rows.selectedMessageIds();

    this.messageActionsHandler.updateMessages({
      messageIds: messageIds,
      updateLocal: (msgIds: number[]) => {
        let folderPath;
        const folders = this.messagelistservice.folderListSubject.value;
        folderPath = folders.find(fld => fld.folderId === folderId).folderPath;

        // FIXME: Make a "not indexed folder list" somewhere!?
        // moveMessagesToFolder cant see these cos not in index
        if (this.selectedFolder !== this.messagelistservice.spamFolderName &&
          this.selectedFolder !== this.messagelistservice.trashFolderName) {
          // remove from current message display
          this.canvastable.rows.removeMessages(messageIds);
          this.searchService.moveMessagesToFolder(msgIds, folderPath);
        }
        this.messagelistservice.moveMessages(msgIds, folderPath);
      },
      updateRemote: (msgIds: number[]) => {
        const userFolders = this.messagelistservice.folderListSubject.value;
        const currentFolderId = userFolders.find(fld => fld.folderPath === this.messagelistservice.currentFolder).folderId;
        return this.rmmapi.moveToFolder(messageIds, folderId, currentFolderId);
      }
    });
  }

  public moveToFolder() {
    const dialogRef: MatDialogRef<MoveMessageDialogComponent> = this.dialog.open(MoveMessageDialogComponent);
//    dialogRef.componentInstance.messageActionsHandler = this.messageActionsHandler;
    const messageIds = this.canvastable.rows.selectedMessageIds();

    console.log('selected messages', messageIds);
    // dialogRef.componentInstance.selectedMessageIds = messageIds;
    dialogRef.afterClosed().subscribe(folder => {
      if (folder) {
        this.messageActionsHandler.updateMessages({
          messageIds: messageIds,
          updateLocal: (msgIds: number[]) => {
            let folderPath;
            const folders = this.messagelistservice.folderListSubject.value;
            folderPath = folders.find(fld => fld.folderId === folder).folderPath;
            console.log('Moving to folder', folderPath, messageIds);
            // FIXME: Make a "not indexed folder list" somewhere!?
            // moveMessagesToFolder cant see these cos not in index
            if (this.selectedFolder !== this.messagelistservice.spamFolderName &&
              this.selectedFolder !== this.messagelistservice.trashFolderName) {
              // remove from current message display
              this.canvastable.rows.removeMessages(messageIds);
              this.searchService.moveMessagesToFolder(msgIds, folderPath);
            }
            this.messagelistservice.moveMessages(msgIds, folderPath);
            this.clearSelection();
            this.canvastable.rows.clearOpenedRow();
          },
          updateRemote: (msgIds: number[]) => {
            const userFolders = this.messagelistservice.folderListSubject.value;
            const currentFolderId = userFolders.find(fld => fld.folderPath === this.messagelistservice.currentFolder).folderId;
            return this.messagelistservice.rmmapi.moveToFolder(msgIds, folder, currentFolderId);
          }
        });
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
    this.searchFor('');
    this.switchToFolder(folder);
    this.updateUrlFragment();
  }

  private switchToFolder(folder: string): void {
    if (folder === this.selectedFolder) {
        return;
    }

    console.log('Change selectedFolder');
    this.clearSelection();

    let doResetColumns = false;
    if (folder.startsWith('Sent') || this.selectedFolder?.startsWith('Sent')) {
      doResetColumns = true;
    }

    this.selectedFolder = folder;

    // FIXME: fairly sure this is redundant, the messageDisplay setting
    // in the subscribe in ngInit should do it for us
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

  resetColumns() {
    if (this.canvastable && this.canvastable.rows) {
      this.canvastable.columns = this.canvastable.rows.getCanvasTableColumns(this);
    }
    this.canvastable.rowWrapModeWrapColumn = 3;
    this.canvastable.rowWrapModeDefaultSelectedColumn = 3;
    this.autoAdjustColumnWidths();
  }

  showSaveSearchDialog(): void {
    const dialog = this.dialog.open(SimpleInputDialog, {
        data: new SimpleInputDialogParams(
            'Save search',
            'Save this search for later',
            'Your name for this search query',
            (value: string) => value && value.trim().length > 0
        )
    });
    dialog.afterClosed().pipe(
        filter(res => res && res.length > 0),
    ).subscribe(searchName => {
        this.savedSearchService.add({
            name: searchName,
            query: this.searchText,
        });
    });
  }

  updateTooltips() {
    this.unreadOnlyToolTip = this.viewmode === 'conversations'
      ? 'Leave threaded mode to view unread only'
      : 'Unread messages only';
    this.conversationGroupingToolTip = !this.showingSearchResults
      ? 'Synchronise the index to see threaded view'
      :  this.unreadMessagesOnlyCheckbox
        ? 'Leave unread only to see threaded view'
        : 'Threaded conversation view';
  }

  // FIXME: Why do we run this when searchText is empty?
  // FIXME: move updateSearch (for index searches) into
  // searchmessagedisplay filterBy ?
  updateSearch(always?: boolean, noscroll?: boolean) {
    if (!this.dataReady || this.showingWebSocketSearchResults) {
      // May have changed unread checkbox so reset / filter message display
      this.filterMessageDisplay();
      return;
    }
    const setting = this.unreadMessagesOnlyCheckbox ? 'true' : 'false';
    localStorage.setItem(LOCAL_STORAGE_SHOW_UNREAD_ONLY, setting);
    this.updateTooltips();

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

        this.setMessageDisplay('messagelist', this.messagelist);

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
              const restrictToUnread = this.unreadMessagesOnlyCheckbox
                && !this.messagelistservice.ignoreUnreadInFolders.includes(this.selectedFolder)
                ? true : false;
              querytext += this.searchService.getFolderQuery(querytext, this.selectedFolder, restrictToUnread);
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
            this.setMessageDisplay('search', this.searchService, searchResults);
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
            let localIndexDecision = 'clicked-away';
            if (res === true) {
              localIndexDecision = 'yes';
            }
            if (res === false) {
              localIndexDecision = 'no';
            }
            this.usage.report(`local-index-decision-${localIndexDecision}`);

            if (res) {
              this.downloadIndexFromServer();
            } else {
              this.usewebsocketsearch = true;
            }
            this.updateTooltips();
          });
        }
      })
    ).subscribe();
  }

  private updateUrlFragment(messageId?: number): void {
    if (this.router.url.match('^/[^#]')) {
      // we're not actually on mailviewer, so don't try to be smart
      return;
    }
    let fragment = this.selectedFolder;
    if (fragment && messageId) { //  || this.singlemailviewer?.messageId) {
      //      fragment += `:${this.singlemailviewer.messageId}`;
      fragment += `:${messageId}`;
    }

    // navigating to the same page does not fire off our fragment.subscribe
    if (fragment !== this.fragment) {
      this.fragment = fragment;
    }
    this.router.navigate(['/'], { fragment });
  }
}

// vim: set shiftwidth=2
