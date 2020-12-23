// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2020 Runbox Solutions AS (runbox.com).
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

import { Component, EventEmitter, OnInit, ViewChild } from '@angular/core';

import { MessageListComponent, RowSelection } from './messagelistcomponent';
import { CanvasTableComponent, CanvasTableContainerComponent } from '../canvastable/canvastable';
import { MessageDisplay } from '../common/messagedisplay';
import { AppComponent } from '../app.component';
import { Subject } from 'rxjs';

@Component({
    selector: 'app-canvasmessagelist',
    template: `<canvastablecontainer></canvastablecontainer>`,
})
export class CanvasMessageListComponent implements MessageListComponent, OnInit {
    @ViewChild(CanvasTableContainerComponent, { static: true }) canvastablecontainer: CanvasTableContainerComponent;

    get canvastable(): CanvasTableComponent {
        return this.canvastablecontainer.canvastable;
    }

    ngOnInit() {
        this.canvastablecontainer.sortColumn = 2;
        this.canvastablecontainer.sortDescending = true;
    }

    // required by MessageListComponent

    get rows(): MessageDisplay {
        return this.canvastable.rows;
    }

    set rows(r: MessageDisplay) {
        this.canvastable.rows = r;
    }

    get sortColumn(): number {
        return this.canvastablecontainer.sortColumn;
    }

    get sortDescending(): boolean {
        return this.canvastablecontainer.sortDescending;
    }

    detectChanges(): void {
        this.canvastablecontainer.canvastable.hasChanges = true;
    }

    resetColumns(app: AppComponent): void {
        this.canvastable.resetColumns(app);
    }

    scrollDown(): void {
        this.canvastable.scrollDown();
    }

    scrollUp(): void {
        this.canvastable.scrollUp();
    }

    scrollTop(): void {
        this.canvastable.scrollTop();
    }

    get rowSelected(): EventEmitter<RowSelection> {
        return this.canvastable.rowSelected;
    }

    get scrollLimitHit(): Subject<number> {
        return this.canvastable.scrollLimitHit;
    }

    get sortToggled(): Subject<void> {
        return this.canvastablecontainer.sortToggled;
    }

    get visibleRowsChanged(): Subject<number[]> {
        return this.canvastable.visibleRowsChanged;
    }
}
