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

import { Component, EventEmitter } from '@angular/core';

import { MessageListComponent, RowSelection } from './messagelistcomponent';
import { MessageDisplay } from '../common/messagedisplay';
import { AppComponent } from '../app.component';
import { Subject } from 'rxjs';
import { CanvasTableColumn } from '../canvastable/canvastablecolumn';

interface Message {
    rowid: number;
    from: string;
    date: string;
    subject: string;
    unread: boolean;
}

@Component({
    selector: 'app-nativemessagelist',
    templateUrl: 'nativemessagelist.component.html',
    styleUrls: ['nativemessagelist.component.scss'],
})
export class NativeMessageListComponent implements MessageListComponent {
    sortColumn = 2;
    sortDescending = true;

    sortToggled: Subject<void> = new Subject();
    scrollLimitHit: Subject<number> = new Subject();
    visibleRowsChanged: Subject<number[]> = new Subject();
    rowSelected: EventEmitter<RowSelection> = new EventEmitter();
    rows: MessageDisplay;
    shownRows: Message[] = [];

    offset = 0;
    rowsDisplayed = 10;
    upto: number;
    rowCount: number;
    remaining: number;

    columns: CanvasTableColumn[];
    columnNames: string[];
    columnsByName: Map<string, number>;

    detectChanges(): void {
        if (!this.rows) {
            return;
        }
        this.shownRows = [];
        this.upto = this.offset + this.rowsDisplayed;
        this.rowCount = this.rows.rowCount();
        if (this.rowCount < this.upto) {
            this.upto = this.rowCount;
        }
        for (let i = this.offset; i < this.upto; i++) {
            const row = this.columns.map(c => {
                let value = c.getValue(i);
                if (c.getFormattedValue) {
                    value = c.getFormattedValue(value);
                }
                return value;
            });
            this.shownRows.push({
                rowid:   i,
                from:    row[this.columnsByName['From']],
                subject: row[this.columnsByName['Subject']],
                date:    row[this.columnsByName['Date']],
                unread:  this.rows.getRowSeen(i),
            });
        }
        this.remaining = this.rowCount - this.upto;
    }

    resetColumns(app: AppComponent): void {
        this.columns = this.rows.getCanvasTableColumns(app);
        this.columnNames = [];
        this.columnsByName = new Map();
        for (let i = 0; i < this.columns.length; i++) {
            const name = this.columns[i].name;
            if (name) {
                this.columnNames.push(name);
                this.columnsByName[name] = i;
            }
        }
        // console.log("Columns have changed:", this.columnNames.join(', '));
        // console.log(this.columnsByName);
        this.detectChanges();
    }

    openMessage(i: number): void {
        this.rowSelected.emit({
            rowIndex:    i,
            colIndex:    1,
            multiSelect: false,
        });
    }

    scrollDown(): void {
        this.offset += this.rowsDisplayed;
        this.detectChanges();
    }
    scrollUp(): void {
        this.offset -= this.rowsDisplayed;
        this.detectChanges();
    }
    scrollTop(): void {
        this.offset = 0;
        this.detectChanges();
    }
}
