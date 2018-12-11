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

import { Component, OnInit } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { RunboxWebmailAPI, FolderCountEntry, FromAddress, RunboxMe, Alias } from './rbwebmail';
import { MatSnackBarModule, MatListModule, MatDialog, MatDialogModule } from '@angular/material';

@Component({
    // tslint:disable-next-line:component-selector
    selector: 'testcomponent',
    template: ``
})
export class TestComponent implements OnInit {

    constructor(private http: HttpClient, public rbwmapi: RunboxWebmailAPI) {

    }

    ngOnInit() {
        // this.rbwmapi.listAllMessages(0).subscribe((res) => console.log(res));
    }
}

describe('RBWebMail', () => {

    let comp:    TestComponent;
    let fixture: ComponentFixture<TestComponent>;

    beforeEach(() => {
        const testingmodule = TestBed.configureTestingModule({
            imports: [HttpClientModule,
                MatDialogModule,
                MatSnackBarModule,
                MatListModule],
            declarations: [ TestComponent ], // declare the test component
            providers: [RunboxWebmailAPI]
        });

        fixture = TestBed.createComponent(TestComponent);

        comp = fixture.componentInstance; // Component test instance
        console.log('Component initialized');
    });
});
