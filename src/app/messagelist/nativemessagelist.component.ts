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

import { AfterViewInit, Component, EventEmitter, Input, OnChanges, ViewChild } from '@angular/core';

import { MessageListComponent, RowSelection } from './messagelistcomponent';
import { MessageDisplay } from '../common/messagedisplay';
import { AppComponent } from '../app.component';
import { Subject } from 'rxjs';
import { CanvasTableColumn } from '../canvastable/canvastablecolumn';
import {MatTableDataSource} from '@angular/material/table';
import {PageEvent} from '@angular/material/paginator';

interface Message {
    rowid: number;
    from: string;
    date: string;
    subject: string;
    unread: boolean;
    count: number;
    contentPreview?: string;
}

@Component({
    selector: 'app-nativemessagelist',
    templateUrl: 'nativemessagelist.component.html',
    styleUrls: ['nativemessagelist.component.scss'],
})
export class NativeMessageListComponent implements MessageListComponent, OnChanges {
    @Input() inlinePreviews = false;

    sortColumn = 2;
    sortDescending = true;

    sortToggled: Subject<void> = new Subject();
    scrollLimitHit: Subject<number> = new Subject();
    visibleRowsChanged: Subject<number[]> = new Subject();
    rowSelected: EventEmitter<RowSelection> = new EventEmitter();
    rows: MessageDisplay;
    shownRows: Message[] = [];

    dataSource = new MatTableDataSource<Message>([]);

    pageIndex = 0;
    rowsDisplayed = 10;
    upto: number;
    rowCount: number;
    remaining: number;

    columns: CanvasTableColumn[];
    defaultColumns = ['date', 'from', 'subject'];
    shownColumns: string[] = [];
    columnsByName: Map<string, number>;

    get offset(): number {
        return this.pageIndex * this.rowsDisplayed;
    }

    ngOnChanges(): void {
        this.detectChanges();
    }

    changePage(event: PageEvent) {
        this.pageIndex = event.pageIndex;
        this.rowsDisplayed = event.pageSize;
        this.detectChanges();
    }

    detectChanges(): void {
        const t1 = (new Date()).getTime();
        if (!this.rows) {
            return;
        }
        this.shownRows = [];
        this.upto = (this.pageIndex + 1) * this.rowsDisplayed;
        this.rowCount = this.rows.rowCount();
        if (this.rowCount < this.upto) {
            this.upto = this.rowCount;
        }

        let retry = false;

        for (let i = this.offset; i < this.upto; i++) {
            let contentPreview: string;
            const row = this.columns.map(c => {
                let value = c.getValue(i);
                if (c.getFormattedValue) {
                    value = c.getFormattedValue(value);
                }
                if (c.getContentPreviewText && this.inlinePreviews) {
                    contentPreview = c.getContentPreviewText(i);
                }
                return value;
            });
            if (row[this.columnsByName.get('Count')] === 'RETRY') {
                retry = true;
            }
            this.shownRows.push({
                rowid:   i,
                from:    row[this.columnsByName.get('From') || this.columnsByName.get('To')],
                subject: row[this.columnsByName.get('Subject')],
                date:    row[this.columnsByName.get('Date')],
                count:   row[this.columnsByName.get('Count')],
                unread:  this.rows.getRowSeen(i),
                contentPreview,
            });
        }
        this.remaining = this.rowCount - this.upto;
        if (retry) {
            setTimeout(() => this.detectChanges(), 50);
        }

        this.dataSource.data = this.shownRows;
        const t2 = (new Date()).getTime();
        console.log("row calculation took", (t2 - t1));
    }

    resetColumns(app: AppComponent): void {
        this.columns = this.rows.getCanvasTableColumns(app);
        this.columnsByName = new Map();
        for (let i = 0; i < this.columns.length; i++) {
            const name = this.columns[i].name;
            if (name) {
                this.columnsByName.set(name, i);
            }
        }
        if (this.columnsByName.has('Count')) {
            console.log('has the count');
            this.shownColumns = this.defaultColumns.concat('count');
        } else {
            this.shownColumns = this.defaultColumns;
        }
        console.log('showncolumns:', this.shownColumns);
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
        /*
        this.pageIndex++;
        this.offset += 1;
        if (this.offset == this.rowCount) {
            this.offset = this.rowCount - 1;
        }
        this.detectChanges();
        */
    }
    scrollUp(): void {
        /*
        this.offset -= 1;
        if (this.offset < 0) {
            this.offset = 0;
        }
        this.detectChanges();
        */
    }
    scrollTop(): void {
        /*
        this.offset = 0;
        this.detectChanges();
        */
    }
}
