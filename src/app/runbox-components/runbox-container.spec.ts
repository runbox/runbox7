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

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { Subject } from 'rxjs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';

import { MobileQueryService } from '../mobile-query.service';
import { RunboxContainerComponent } from './runbox-container';

@Component({
    selector: 'app-sidenav-menu',
    template: '',
})
class SidenavMenuStubComponent {}

@Component({
    template: `
        <app-runbox-container>
            <nav><div id="projected-nav">Settings nav</div></nav>
            <div toolbar id="projected-toolbar">Toolbar</div>
            <div id="projected-content">Content</div>
        </app-runbox-container>
    `,
})
class HostComponent {}

describe('RunboxContainerComponent', () => {
    let fixture: ComponentFixture<HostComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                MatListModule,
                MatSidenavModule,
                NoopAnimationsModule,
                RouterTestingModule.withRoutes([]),
            ],
            declarations: [
                HostComponent,
                RunboxContainerComponent,
                SidenavMenuStubComponent,
            ],
            providers: [
                { provide: MobileQueryService, useValue: { matches: true, changed: new Subject<boolean>() } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
    });

    it('projects toolbar content into the sidenav content area', () => {
        const sidenavContent = fixture.nativeElement.querySelector('mat-sidenav-content');
        const toolbar = fixture.nativeElement.querySelector('#projected-toolbar');
        const mainContent = fixture.nativeElement.querySelector('#projected-content');

        expect(toolbar).toBeTruthy();
        expect(mainContent).toBeTruthy();
        expect(sidenavContent.textContent).toContain('Toolbar');
        expect(sidenavContent.textContent).toContain('Content');
    });

    it('keeps navigation content inside the sidenav', () => {
        const sideMenu = fixture.nativeElement.querySelector('mat-sidenav');
        const nav = fixture.nativeElement.querySelector('#projected-nav');

        expect(nav).toBeTruthy();
        expect(sideMenu.textContent).toContain('Settings nav');
    });
});
