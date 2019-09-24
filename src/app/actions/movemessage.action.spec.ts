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

import { Component, OnInit, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MoveMessageDialogComponent } from './movemessage.action';
import { MatDialogModule, MatDialog } from '@angular/material';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserDynamicTestingModule } from '@angular/platform-browser-dynamic/testing';
import { RunboxWebmailAPI, FolderCountEntry } from '../rmmapi/rbwebmail';
import { Observable } from 'rxjs/Observable';
import { SearchService } from '../xapian/searchservice';
import { Router } from '@angular/router';

@Component({
    // tslint:disable-next-line:component-selector
    selector: 'testcomponent',
    template: ``
})
export class TestComponent implements OnInit {

    constructor(
        public dialog: MatDialog) {

    }

    ngOnInit() {

    }
}

export class MockRunboxWebmailAPI {
    public getFolderCount(): Observable<any> {
        return new Observable((observer) =>
            observer.next([new FolderCountEntry(234, 3, 3, 'user', 'Blabla', '/', 0)])
        );
    }

    public moveToFolder(messageIds: number[], folderId: number): Observable<any> {
        return new Observable((observer) => {
            console.log('Moving');
            console.log(messageIds);
            console.log('to folder ' + folderId);
            observer.next();
        });
    }
}

describe('MoveMessageAction', () => {
    let comp: TestComponent;
    let fixture: ComponentFixture<TestComponent>;

    beforeEach(() => {
        const testingmodule = TestBed.configureTestingModule({
            imports: [HttpClientModule, MatDialogModule, NoopAnimationsModule],
            declarations: [
                MoveMessageDialogComponent, TestComponent
            ],
            providers: [
                { provide: SearchService, useValue: {}},
                { provide: Router, useValue: {}},
                { provide: RunboxWebmailAPI, useClass: MockRunboxWebmailAPI }
            ],
            schemas: [NO_ERRORS_SCHEMA]
        });

        TestBed.overrideModule(BrowserDynamicTestingModule, {
            set: {
                entryComponents: [MoveMessageDialogComponent]
            }
        });
        fixture = TestBed.createComponent(TestComponent);

        comp = fixture.componentInstance; // Component test instance
        console.log('Component initialized');
    });

    it('testMoveMessages', fakeAsync(() => {
        fixture.detectChanges();

        const dialogRef = comp.dialog.open(MoveMessageDialogComponent);

        let afterClosed = 0;
        dialogRef.afterClosed().subscribe(folder =>
            afterClosed = folder);

        dialogRef.componentInstance.selectedMessageIds =
            [1, 2, 3, 4];

        tick();
        fixture.detectChanges();

        const folders = dialogRef.componentInstance.folderCountEntries;
        expect(folders.length).toBe(1);
        expect(folders[0].folderId).toBe(234);
        expect(folders[0].folderName).toBe('Blabla');

        dialogRef.componentInstance.moveMessages(234);
        tick(10000);

        expect(afterClosed).toBe(234);
        console.log('Moved to folder ' + afterClosed);

    }));
});
