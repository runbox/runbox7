// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2026 Runbox Solutions AS (runbox.com).
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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, ReplaySubject } from 'rxjs';

import { HeaderToolbarComponent } from './headertoolbar.component';
import { MenuModule } from './menu.module';
import { LogoutService } from '../login/logout.service';
import { RunboxMe, RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { RMMOfflineService } from '../rmmapi/rmmoffline.service';
import { FolderMessageCountMap, MessageListService } from '../rmmapi/messagelist.service';

class MockRunboxWebmailAPI {
    me = of({
        is_trial: false,
        owner: null,
    } as RunboxMe);
}

class MockRMMOfflineService {
    is_offline = false;
}

class MockLogoutService {
    logout() {}
}

class MockMessageListService {
    folderMessageCountSubject = new ReplaySubject<FolderMessageCountMap>(1);
}

describe('HeaderToolbarComponent', () => {
    let fixture: ComponentFixture<HeaderToolbarComponent>;
    let messageListService: MockMessageListService;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                MenuModule,
                MatIconTestingModule,
                NoopAnimationsModule,
                RouterTestingModule,
            ],
            providers: [
                { provide: RunboxWebmailAPI, useClass: MockRunboxWebmailAPI },
                { provide: RMMOfflineService, useClass: MockRMMOfflineService },
                { provide: LogoutService, useClass: MockLogoutService },
                { provide: MessageListService, useClass: MockMessageListService },
            ]
        }).compileComponents();

        messageListService = TestBed.inject(MessageListService) as unknown as MockMessageListService;
    });

    it('shows the unread mail count on the Mail menu item', () => {
        fixture = TestBed.createComponent(HeaderToolbarComponent);

        messageListService.folderMessageCountSubject.next({
            Inbox: { unread: 2, total: 12 },
            'Lists.News': { unread: 5, total: 20 },
            Spam: { unread: 0, total: 4 },
        });
        fixture.detectChanges();

        const mailLink = fixture.debugElement.query(By.css('a[routerLink="/"]')).nativeElement as HTMLElement;
        const badge = mailLink.querySelector('.mat-badge-content');

        expect(badge?.textContent.trim()).toBe('7');
        expect(mailLink.getAttribute('aria-label')).toBe('Mail, 7 unread messages');
    });
});
