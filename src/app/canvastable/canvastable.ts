// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2022 Runbox Solutions AS (runbox.com).
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

/*
 *  Copyright 2010-2018 FinTech Neo AS / Runbox ( fintechneo.com / runbox.com )- All rights reserved
 */


import {
  NgModule, Component, AfterViewInit,
  Input, Output,
  ElementRef,
  EventEmitter, OnInit, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyMenuModule as MatMenuModule, MatLegacyMenuTrigger as MatMenuTrigger } from '@angular/material/legacy-menu';
import { MatLegacyRadioModule as MatRadioModule } from '@angular/material/legacy-radio';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyTooltipModule as MatTooltipModule, MatLegacyTooltip as MatTooltip } from '@angular/material/legacy-tooltip';
import { BehaviorSubject ,  Subject } from 'rxjs';
import { MessageDisplay } from '../common/messagedisplay';
import { CanvasTableColumn } from './canvastablecolumn';
import { PreferencesService } from '../common/preferences.service';

const MIN_COLUMN_WIDTH = 40;

const getCSSClassProperty = (className, propertyName) => {
  const elementId = '_classPropertyLookup_' + className;
  let element: HTMLSpanElement = document.getElementById(elementId);
  if (!element) {
    element = document.createElement('span');
    element.id = elementId;
    element.className = className;
    element.style.display = 'none';
    document.documentElement.appendChild(element);
  }
  return window.getComputedStyle(element, null).getPropertyValue(propertyName);
};

export interface CanvasTableSelectListener {
  rowSelected(rowIndex: number, colIndex: number, multiSelect?: boolean): void;
  saveColumnWidthsPreference(widths);
}

export class FloatingTooltip {
  constructor(public top: number,
    public left: number,
    public width: number,
    public height: number,
    public tooltipText: string) {

  }
}

export namespace CanvasTable {
  export enum RowSelect {
    Visible = 'visible',
    All     = 'all',
  }
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'canvastable',
  templateUrl: 'canvastable.component.html'
})
export class CanvasTableComponent implements AfterViewInit, OnInit {
  static incrementalId = 1;
  public elementId: string;
  private _topindex = 0.0;
  public get topindex(): number { return this._topindex; }
  public set topindex(topindex: number) {
    if (this._topindex !== topindex) {
      this._topindex = topindex;
      this.hasChanges = true;
    }
  }

  @Input() columnWidths = {};

  @Output() columnresize = new EventEmitter<number>();
  @Output() columnresizeend = new EventEmitter<number>();
  @Output() columnresizestart = new EventEmitter<any>();

  @ViewChild(MatTooltip) columnOverlay: MatTooltip;

  repaintDoneSubject: Subject<any> = new Subject();
  canvasResizedSubject: Subject<boolean> = new Subject();

  private _rowheight = 28;

  private scrollbarwidth = 12;

  public fontFamily = '"Avenir Next Pro Regular", "Helvetica Neue", sans-serif';
  public fontFamilyBold = '"Avenir Next Pro Medium", "Helvetica Neue", sans-serif';

  private maxVisibleRows: number;

  private scrollBarRect: any;

  private scrollbarDragInProgress = false;
  columnResizeInProgress = false;

  visibleColumnSeparatorAlpha = 0;
  visibleColumnSeparatorIndex = 0;
  lastClientY: number;

  public _horizScroll = 0;
  public get horizScroll(): number { return this._horizScroll; }
  public set horizScroll(horizScroll: number) {

    if (this._horizScroll !== horizScroll) {
      this._horizScroll = horizScroll;
      this.hasChanges = true;
    }
  }

  //  public _rows: any[] = [];
  public _rows: MessageDisplay;

  columnWidthsDefaults = {
    '':        40,
    'Date':    110,
    'To':      300,
    'From':    300,
    'Subject': 300,
    'Size':    80,
    'Count':   80,
  };

  public hasSortColumns = false;
  public _columns: CanvasTableColumn[] = [];
  public get columns(): CanvasTableColumn[] { return this._columns; }
  public set columns(columns: CanvasTableColumn[]) {
    if (this._columns !== columns) {
      this.calculateColumnWidths(columns);
      this._columns = columns;
      this.hasSortColumns = columns.filter(col => col.sortColumn !== null).length > 0;
      this.hasChanges = true;    }
  }

  // Colors retrieved from css classes
  textColorLink: string = getCSSClassProperty('themePalettePrimary', 'color');
  selectedRowColor: string = getCSSClassProperty('themePaletteAccentLighter', 'color');
  openedRowColor: string = getCSSClassProperty('themePaletteLighterGray', 'color');
  hoverRowColor: string = getCSSClassProperty('themePaletteLightGray', 'color');
  textColor: string = getCSSClassProperty('themePaletteBlack', 'color');


  public colpaddingleft = 10;
  public colpaddingright = 10;
  public seprectextraverticalpadding = 4; // Extra padding above/below for separator rectangles

  // Auto row wrap mode (width based on iphone 5) - set to 0 to disable row wrap mode
  public autoRowWrapModeWidth = 540;

  public rowWrapMode = true;
  public rowWrapModeWrapColumn = 2;
  public rowWrapModeDefaultSelectedColumn = 2;

  public _showContentTextPreview = false;

  public hasChanges: boolean;

  public scrollLimitHit: BehaviorSubject<number> = new BehaviorSubject(0);

  public floatingTooltip: FloatingTooltip;

  @Input() selectListener: CanvasTableSelectListener;
  @Output() touchscroll = new EventEmitter();

  touchScrollSpeedY = 0;

  // Are we selecting all rows, or just the visible ones?
  public selectWhichRows = CanvasTable.RowSelect.Visible;

  constructor(elementRef: ElementRef) {
  }

  private calculateColumnWidths(columns: CanvasTableColumn[]) {
    const colWidthSet = columns.map((col) => col.name).filter((cname) => cname.length > 0).join(',');
    for (const c of columns) {
      // try the stored settings, then an existing value, then 100px just in case
      c.width = this.columnWidths[colWidthSet]
        ? this.columnWidths[colWidthSet][c.name]
        : this.columnWidthsDefaults[c.name] || c.width || 100;
    }
  }

  ngOnInit() {
    this.calculateColumnWidths(this.columns);
  }

  ngAfterViewInit() {
    /**
     * Returns true if clientX/Y is inside the scrollbar area and if wholeScrollbar specified then not just the draggable slider
     * @param clientX
     * @param clientY
     * @param wholeScrollbar include whole scrollbar area, not just the draggable slider
     */

  }

  public getColIndexByClientX(clientX: number) {
    if (this.rowWrapMode) {
      return clientX > this.columns[0].width ? this.rowWrapModeDefaultSelectedColumn : 0;
    } else {
      let x = -this.horizScroll;
      let selectedColIndex = 0;
      for (; selectedColIndex < this.columns.length; selectedColIndex++) {
        const col = this.columns[selectedColIndex];
        if (clientX >= x && clientX < x + col.width) {
          break;
        }
        x += col.width;
      }
      return selectedColIndex;
    }
  }

  public isScrollInProgress(): boolean {
    return this.scrollbarDragInProgress || Math.abs(this.touchScrollSpeedY) > 0;
  }

  public getVisibleRowIndexes(): number[] {
    return new Array(Math.floor(this.maxVisibleRows))
      .fill(0).map((v, n) => Math.round(this.topindex + n));
  }

  public selectRows() {
    if (this.selectWhichRows === CanvasTable.RowSelect.Visible) {
      this.selectAllVisibleRows();
    } else {
      this.selectAllRows();
    }
  }

  public selectAllRows() {
    const allSelected = this.rows.allSelected();

    this.rows.rows.forEach((rowobj, rowIndex) =>
      this.selectListener.rowSelected(
        rowIndex,
        0,
        !allSelected
      )
    );
  }

  public selectAllVisibleRows() {
    const visibleRowIndexes = this.getVisibleRowIndexes();

    const visibleRowsAlreadySelected = visibleRowIndexes.reduce((prev, next) =>
      prev &&
      (next >= this.rows.rowCount() || this.rows.isSelectedRow(next))
      , true);

    visibleRowIndexes.forEach(selectedRowIndex =>
      this.selectListener.rowSelected(selectedRowIndex,
        0,
        !visibleRowsAlreadySelected)
    );

    this.hasChanges = true;
  }

  public selectRowByIndex(clientX: number, selectedRowIndex: number, multiSelect?: boolean) {
    this.selectListener.rowSelected(selectedRowIndex,
      this.getColIndexByClientX(clientX),
      multiSelect);

    this.hasChanges = true;
  }

  public autoAdjustColumnWidths(minwidth: number, tryFitScreenWidth = false) {
    // Make innert
    return

    const canvasWidth = Math.floor(window.devicePixelRatio) - this.scrollbarwidth - 2;

    const columnsTotalWidth = () => this.columns.reduce((prev, curr) => prev + curr.width, 0);

    if (!this.rowWrapMode && tryFitScreenWidth) {
      // Reduce the width of the widest column to fit screen

      const findWidestColumn = () => this.columns.reduce((prev, curr) =>
        prev.width < curr.width ? curr : prev, this.columns[0]);

      if (columnsTotalWidth() < canvasWidth) {
        // Restore original column widths since we are using less space than the canvas width
        this.columns
          .filter(col => col.originalWidth ? true : false)
          .forEach(col => {
            col.width = col.originalWidth;
            col.originalWidth = null;
          });
      }

      let widestColumn = findWidestColumn();

      // Reduce column widths
      while (widestColumn.width > minwidth && columnsTotalWidth() > canvasWidth) {
        if (!widestColumn.originalWidth) {
          widestColumn.originalWidth = widestColumn.width;
        }
        widestColumn.width--;
        if (widestColumn.width < minwidth) {
          widestColumn.width = minwidth;
        }
        widestColumn = findWidestColumn();
      }
    }

    this.hasChanges = true;
  }

  public scrollTop() {
    this.topindex = 0;
    this.hasChanges = true;
  }

  public scrollUp() {
    this.topindex--;
    this.hasChanges = true;
  }

  public scrollDown() {
    this.topindex++;
    this.hasChanges = true;
  }

  public get rows(): MessageDisplay {
    return this._rows;
  }

  public set rows(rows: MessageDisplay) {
    if (this._rows !== rows) {
      this._rows = rows;

      this.hasChanges = true;
    }
  }

  public updateRows(newList) {
    this.rows.setRows(newList);
    this.hasChanges = true;
  }

  public get showContentTextPreview(): boolean {
    return this._showContentTextPreview;
  }

  public set showContentTextPreview(showContentTextPreview: boolean) {
    this._showContentTextPreview = showContentTextPreview;
    this.hasChanges = true;
  }

  // When loading a url with a fragment containing a msg id - scroll to there
  public jumpToOpenMessage() {
    // currently selected row in the centre:
    if (this.rows.rowCount() > 0 && this.rows.openedRowIndex) {
      this.topindex = this.rows.openedRowIndex - Math.round(this.maxVisibleRows / 2);
    }
  }

  // Height of message list rows
  public get rowheight(): number {
    return (this.rowWrapMode || this.showContentTextPreview ) ?
      1.75 * this._rowheight : this._rowheight;
  }

  public set rowheight(rowheight: number) {
    if (this._rowheight !== rowheight) {
      this._rowheight = rowheight;
      this.hasChanges = true;
    }
  }

}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'canvastablecontainer',
  templateUrl: 'canvastablecontainer.component.html',
  styleUrls: ['canvastablecontainer.component.scss']
})
export class CanvasTableContainerComponent {
  colResizeInitialClientX: number;
  colResizeColumnIndex: number;
  colResizePreviousWidth: number;

  columnResized: boolean;
  sortColumn = 0;
  sortDescending = false;

  columnWidths = {};

  preferenceService: PreferencesService;

  @Input() configname = 'default';
  @Input() canvastableselectlistener: CanvasTableSelectListener;

  @Output() sortToggled: EventEmitter<any> = new EventEmitter();

  @ViewChild(CanvasTableComponent, { static: true  }) canvastable:        CanvasTableComponent;
  @ViewChild('tablecontainer') tablecontainer:     ElementRef<HTMLDivElement>;
  @ViewChild('tablebodycontainer') tablebodycontainer: ElementRef<HTMLDivElement>;
  @ViewChild(MatMenuTrigger) trigger: MatMenuTrigger;

  RowSelect = CanvasTable.RowSelect;
  private selectAllTimeout;

  saveColumnWidths() {
    const newColWidths = {};
    const colWidthSet = this.canvastable.columns.map((col) => col.name).filter((cname) => cname.length > 0).join(',');
    for (const c of this.canvastable.columns) {
      newColWidths[c.name] = c.width;
    }
    this.columnWidths[colWidthSet] = newColWidths;
    this.canvastableselectlistener.saveColumnWidthsPreference(this.columnWidths);
  }

  colresizestart(clientX: number, colIndex: number) {
    if (colIndex > 0) {
      this.colResizeInitialClientX = clientX;
      // We're always resizing the column before
      this.colResizeColumnIndex = colIndex - 1;
      this.colResizePreviousWidth = this.canvastable.columns[this.colResizeColumnIndex].width;
      this.canvastable.columnResizeInProgress = true;
    }
  }

  colresize(clientX: number) {
    if (this.colResizeInitialClientX) {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions

      const column: CanvasTableColumn = this.canvastable.columns[this.colResizeColumnIndex];
      if (column && column.width) {
        column.width = this.colResizePreviousWidth + (clientX - this.colResizeInitialClientX);
        if (column.width < MIN_COLUMN_WIDTH) {
          column.width = MIN_COLUMN_WIDTH;
        }
        this.canvastable.hasChanges = true;
        this.columnResized = true;

        this.saveColumnWidths();
      }
    }
  }

  public sumWidthsBefore(colIndex: number) {
    let ret = 0;
    for (let n = 0; n < colIndex; n++) {
      ret += this.canvastable.columns[n].width;
    }
    return ret;
  }

  colresizeend() {
    this.colResizeInitialClientX = null;
    this.colResizeColumnIndex = null;
    this.canvastable.columnResizeInProgress = false;
  }

  horizScroll(evt: Event) {
    this.canvastable.horizScroll = evt.target['scrollLeft'];
  }

  handleTouchScroll(scrollValue: number) {
    if (this.tablecontainer.nativeElement.scrollWidth >
      this.tablecontainer.nativeElement.clientWidth) {
      this.tablecontainer.nativeElement.scrollLeft = scrollValue;
    } else {
      this.canvastable.horizScroll = 0;
    }
  }

  public toggleSort(column: number) {
    if (column === null) {
      return;
    }

    if (this.columnResized) {
      this.columnResized = false;
      return;
    }

    if (column === this.sortColumn) {
      this.sortDescending = !this.sortDescending;
    } else {
      this.sortColumn = column;
    }
    this.sortToggled.emit({ sortColumn: this.sortColumn, sortDescending: this.sortDescending });
  }

  public mouseOverSelectAll() {
    this.selectAllTimeout = setTimeout(() => {
      this.trigger.openMenu();
    }, 200);
  }

  public mouseLeftSelectAll() {
     if (this.selectAllTimeout) {
      clearTimeout(this.selectAllTimeout);
       this.trigger.closeMenu();
      this.selectAllTimeout = null;
    }
  }

}


@NgModule({
  imports: [
    CommonModule,
    MatTooltipModule,
    MatButtonModule,
    MatMenuModule,
    MatRadioModule,
    FormsModule,
    MatIconModule
  ],
  declarations: [CanvasTableComponent, CanvasTableContainerComponent],
  exports: [CanvasTableComponent, CanvasTableContainerComponent]
})
export class CanvasTableModule {

}
