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
  Input, Output, Renderer2,
  ElementRef,
  DoCheck, NgZone, EventEmitter, OnInit, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule, MatTooltip } from '@angular/material/tooltip';
import { BehaviorSubject ,  Subject } from 'rxjs';
import { MessageDisplay } from '../common/messagedisplay';
import { CanvasTableColumn } from './canvastablecolumn';

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
  moduleId: 'angular2/app/canvastable/',
  templateUrl: 'canvastable.component.html'
})
export class CanvasTableComponent implements AfterViewInit, DoCheck, OnInit {
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

  @ViewChild('thecanvas') canvRef: ElementRef;

  @Input() columnWidths = {};

  @Output() columnresize = new EventEmitter<number>();
  @Output() columnresizeend = new EventEmitter<number>();
  @Output() columnresizestart = new EventEmitter<any>();

  @ViewChild(MatTooltip) columnOverlay: MatTooltip;

  repaintDoneSubject: Subject<any> = new Subject();
  canvasResizedSubject: Subject<boolean> = new Subject();

  private canv: HTMLCanvasElement;

  private ctx: CanvasRenderingContext2D;
  private wantedCanvasWidth = 300;
  private wantedCanvasHeight = 300;

  private _rowheight = 28;
  private fontheight = 14;
  private fontheightSmall = 13;
  private fontheightSmaller = 12;

  private scrollbarwidth = 12;

  public fontFamily = '"Avenir Next Pro Regular", "Helvetica Neue", sans-serif';
  public fontFamilyBold = '"Avenir Next Pro Medium", "Helvetica Neue", sans-serif';

  private maxVisibleRows: number;

  private scrollBarRect: any;

  private isTouchZoom = false;
  private scrollbarDragInProgress = false;
  columnResizeInProgress = false;
  private scrollbarArea = false;

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

  private lastMouseDownEvent: MouseEvent;
  private _hoverRowIndex: number;
  private get hoverRowIndex(): number { return this._hoverRowIndex; }
  private set hoverRowIndex(hoverRowIndex: number) {
    if (this._hoverRowIndex !== hoverRowIndex) {
      this._hoverRowIndex = hoverRowIndex;
      this.hasChanges = true;
    }
  }

  private dragSelectionDirectionIsDown: Boolean = null;

  // Auto row wrap mode (width based on iphone 5) - set to 0 to disable row wrap mode
  public autoRowWrapModeWidth = 540;

  public rowWrapMode = true;
  public rowWrapModeWrapColumn = 2;
  public rowWrapModeDefaultSelectedColumn = 2;

  public _showContentTextPreview = false;

  public hasChanges: boolean;

  private formattedValueCache: { [key: string]: string; } = {};

  public scrollLimitHit: BehaviorSubject<number> = new BehaviorSubject(0);

  public floatingTooltip: FloatingTooltip;

  @Input() selectListener: CanvasTableSelectListener;
  @Output() touchscroll = new EventEmitter();

  touchScrollSpeedY = 0;

  // Are we selecting all rows, or just the visible ones?
  public selectWhichRows = CanvasTable.RowSelect.Visible;

  constructor(elementRef: ElementRef, private renderer: Renderer2, private _ngZone: NgZone) {
  }

  ngDoCheck() {
    if (this.canv) {

      const devicePixelRatio = window.devicePixelRatio ? window.devicePixelRatio : 1;
      this.wantedCanvasWidth = this.canv.parentElement.parentElement.clientWidth * devicePixelRatio;
      this.wantedCanvasHeight = this.canv.parentElement.parentElement.clientHeight * devicePixelRatio;

      if (this.canv.width !== this.wantedCanvasWidth || this.canv.height !== this.wantedCanvasHeight) {
        this.hasChanges = true;
      }
    }
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
    this.canv = this.canvRef.nativeElement;
    this.ctx = this.canv.getContext('2d');

    this.canv.onwheel = (event: WheelEvent) => {
      event.preventDefault();
      switch (event.deltaMode) {
        case 0:
          // pixels
          this.topindex += (event.deltaY / this.rowheight);
          break;
        case 1:
          // lines
          this.topindex += event.deltaY;
          break;
        case 2:
          // pages
          this.topindex += (event.deltaY * (this.canv.scrollHeight / this.rowheight));
          break;
      }

      this.enforceScrollLimit();
    };

    /**
     * Returns true if clientX/Y is inside the scrollbar area and if wholeScrollbar specified then not just the draggable slider
     * @param clientX
     * @param clientY
     * @param wholeScrollbar include whole scrollbar area, not just the draggable slider
     */
    const checkIfScrollbarArea = (clientX: number, clientY: number, wholeScrollbar?: boolean): boolean => {
      if (!this.scrollBarRect) {
        return false;
      }
      const canvrect = this.canv.getBoundingClientRect();
      const x = clientX - canvrect.left;
      const y = clientY - canvrect.top;
      return x > this.scrollBarRect.x && x < (this.scrollBarRect.x + this.scrollBarRect.width) &&
        (wholeScrollbar || y > this.scrollBarRect.y && y < this.scrollBarRect.y + this.scrollBarRect.height);
    };

    const checkScrollbarDrag = (clientX: number, clientY: number) => {

      if (!this.scrollBarRect) {
        return;
      }

      const canvrect = this.canv.getBoundingClientRect();
      if (checkIfScrollbarArea(clientX, clientY)) {
        this.scrollbarDragInProgress = true;
        this.scrollbarArea = true;
      } else if (checkIfScrollbarArea(clientX, clientY, true)) {
        // Check if click is above or below scrollbar slider

        const y = clientY - canvrect.top;
        if (y < this.scrollBarRect.y) {
          // above
          this.topindex -= this.canv.scrollHeight / this.rowheight;
        } else {
          // below
          this.topindex += this.canv.scrollHeight / this.rowheight;
        }
        this.scrollbarArea = true;
      } else {
        this.scrollbarArea = false;
      }
    };

    this.canv.onmousedown = (event: MouseEvent) => {
      event.preventDefault();
      checkScrollbarDrag(event.clientX, event.clientY);
      this.lastMouseDownEvent = event;

      if (this.visibleColumnSeparatorIndex > 0) {
        this.columnresizestart.emit({ colindex: this.visibleColumnSeparatorIndex, clientx: event.clientX });
      }

      // Reset drag select direction
      this.dragSelectionDirectionIsDown = null;
    };

    let previousTouchY: number;
    let previousTouchX: number;
    let touchMoved = false;

    this.canv.addEventListener('touchstart', (event: TouchEvent) => {
      this.isTouchZoom = false;

      previousTouchX = event.targetTouches[0].clientX;
      previousTouchY = event.targetTouches[0].clientY;
      checkScrollbarDrag(event.targetTouches[0].clientX, event.targetTouches[0].clientY);
      if (this.scrollbarDragInProgress) {
        event.preventDefault();
      }

      touchMoved = false;
    });


    this.canv.addEventListener('touchmove', (event: TouchEvent) => {
      if (event.targetTouches.length > 1) {
        this.isTouchZoom = true;
        return;
      }
      event.preventDefault();
      touchMoved = true;

      if (event.targetTouches.length === 1) {
        const newTouchY = event.targetTouches[0].clientY;
        const newTouchX = event.targetTouches[0].clientX;
        if (this.scrollbarDragInProgress === true) {
          this.doScrollBarDrag(newTouchY);
        } else {

          this.touchScrollSpeedY = (newTouchY - previousTouchY);
          if (Math.abs(this.touchScrollSpeedY) > 0) {
            this.hasChanges = true;
          }

          if (!this.rowWrapMode) {
            this.horizScroll -= (newTouchX - previousTouchX);
          }

          previousTouchY = newTouchY;
          previousTouchX = newTouchX;
        }
        this.enforceScrollLimit();
        this.touchscroll.emit(this.horizScroll);
      }

    }, false);

    this.canv.addEventListener('touchend', (event: TouchEvent) => {
      if (this.isTouchZoom) {
        return;
      }
      event.preventDefault();
      if (!this.scrollbarArea && !touchMoved) {
        this.selectRow(event.changedTouches[0].clientX, event.changedTouches[0].clientY);
      }
      if (this.scrollbarDragInProgress) {
        this.scrollbarDragInProgress = false;
        this.hasChanges = true;
      }
    });

    this.renderer.listen('window', 'mousemove', (event: MouseEvent) => {
      if (this.scrollbarDragInProgress === true) {
        event.preventDefault();
        this.doScrollBarDrag(event.clientY);
      }
    });

    this.canv.onmousemove = (event: MouseEvent) => {
      if (this.scrollbarDragInProgress === true || this.columnResizeInProgress === true) {
        event.preventDefault();
        return;
      }

      const canvrect = this.canv.getBoundingClientRect();
      const clientX = event.clientX - canvrect.left;

      let newHoverRowIndex = this.getRowIndexByClientY(event.clientY);
      if (this.scrollbarDragInProgress || checkIfScrollbarArea(event.clientX, event.clientY, true)) {
        newHoverRowIndex = null;
      }

      if (this.hoverRowIndex !== newHoverRowIndex) {
        // check if mouse is down
        if (this.lastMouseDownEvent) {
          // set drag select direction to true if down, or false if up
          const newDragSelectionDirectionIsDown = newHoverRowIndex > this.hoverRowIndex ? true : false;

          if (this.dragSelectionDirectionIsDown !== newDragSelectionDirectionIsDown) {
            // select previous row on drag select direction change
            this.selectRowByIndex(this.lastMouseDownEvent.clientX, this.hoverRowIndex);
            this.dragSelectionDirectionIsDown = newDragSelectionDirectionIsDown;
          }
          let rowIndex = this.hoverRowIndex;
          // Select all rows between the previous and current hover row index
          while (
            (newDragSelectionDirectionIsDown === true && rowIndex < newHoverRowIndex) ||
            (newDragSelectionDirectionIsDown === false && rowIndex > newHoverRowIndex)
            ) {
            if (newDragSelectionDirectionIsDown === true) {
              rowIndex ++;
            } else {
              rowIndex --;
            }
            this.selectRowByIndex(this.lastMouseDownEvent.clientX, rowIndex);
          }
        }
        this.hoverRowIndex = newHoverRowIndex;
        this.updateDragImage(newHoverRowIndex);
      }

      if (this.dragSelectionDirectionIsDown === null) {
        // Check for column resize
        if (this.lastMouseDownEvent && this.visibleColumnSeparatorIndex > 0) {
          this.columnresize.emit(this.visibleColumnSeparatorIndex);
        } else {
          this.updateVisibleColumnSeparatorIndex(clientX);
        }

        if (this.visibleColumnSeparatorIndex > 0) {
          this.lastClientY = event.clientY - canvrect.top;
          this.hasChanges = true;
          return;
        }
      }

      if (this.dragSelectionDirectionIsDown === null && this.hoverRowIndex !== null) {
        const colIndex = this.getColIndexByClientX(clientX);
        let colStartX = this.columns.reduce((prev, curr, ndx) => ndx < colIndex ? prev + curr.width : prev, 0);

        let tooltipText: string | ((rowIndex: any) => string) =
              this.columns[colIndex] && this.columns[colIndex].tooltipText;

        // FIXME: message display class
        if (typeof tooltipText === 'function' && this.rows.rowExists(this.hoverRowIndex)) {
          tooltipText = tooltipText(this.hoverRowIndex);
        }

        if (!event.shiftKey && !this.lastMouseDownEvent &&
            (tooltipText || (this.columns[colIndex] && this.columns[colIndex].draggable))
          ) {
          if (this.rowWrapMode &&
            colIndex >= this.rowWrapModeWrapColumn) {
            // Subtract first row width if in row wrap mode
            colStartX -= this.columns.reduce((prev, curr, ndx) =>
              ndx < this.rowWrapModeWrapColumn ? prev + curr.width : prev, 0);
          }

          this.floatingTooltip = new FloatingTooltip(
            (this.hoverRowIndex - this.topindex) * this.rowheight,
            colStartX - this.horizScroll + this.colpaddingleft,
            this.columns[colIndex].width - this.colpaddingright - this.colpaddingleft,
            this.rowheight, tooltipText as string);

          if (this.rowWrapMode) {
            this.floatingTooltip.top +=
              + (colIndex >= this.rowWrapModeWrapColumn ? this.rowheight / 2 : 0);
            this.floatingTooltip.height = this.rowheight / 2;
          }

          setTimeout(() => {
            if (this.columnOverlay) {
              this.columnOverlay.show(300);
            }
          }, 0);
        } else {
          this.floatingTooltip = null;
        }
      } else {
        this.floatingTooltip = null;
      }
    };

    this.canv.onmouseout = (event: MouseEvent) => {
      const newHoverRowIndex = null;
      if (this.hoverRowIndex !== newHoverRowIndex) {
        this.hoverRowIndex = newHoverRowIndex;
      }
    };

    this.renderer.listen('window', 'mouseup', (event: MouseEvent) => {
      this.lastMouseDownEvent = undefined;
      if (this.scrollbarDragInProgress) {
        this.scrollbarDragInProgress = false;
        this.hasChanges = true;
      }
    });

    this.canv.onmouseup = (event: MouseEvent) => {
      event.preventDefault();
      if (this.visibleColumnSeparatorIndex > 0) {
        this.columnresizeend.emit();
      } else if (!this.scrollbarArea && this.lastMouseDownEvent) {
        const lastcol = this.getColIndexByClientX(this.lastMouseDownEvent.clientX);
        const thiscol = this.getColIndexByClientX(event.clientX);
        const lastrow = this.getRowIndexByClientY(this.lastMouseDownEvent.clientY);
        const thisrow = this.getRowIndexByClientY(event.clientY);
        if (lastcol === thiscol && lastrow === thisrow) {
          this.selectRow(event.clientX, event.clientY);
        }
      }

      this.lastMouseDownEvent = null;
      this.dragSelectionDirectionIsDown = null;
    };


    this.renderer.listen('window', 'resize', () => true);

    const paintLoop = () => {
      if (this.hasChanges) {
        if (Math.abs(this.touchScrollSpeedY) > 0) {
          // Scroll if speed
          this.topindex -= this.touchScrollSpeedY / this.rowheight;

          // ---- Enforce scroll limit
          if (this.topindex < 0) {
            this.topindex = 0;
          } else if (this.rows.rowCount() < this.maxVisibleRows) {
            this.topindex = 0;
          } else if (this.topindex + this.maxVisibleRows > this.rows.rowCount()) {
            this.topindex = this.rows.rowCount() - this.maxVisibleRows;
          }
          // ---------

          // Slow down
          this.touchScrollSpeedY *= 0.9;
          if (Math.abs(this.touchScrollSpeedY) < 0.4) {
            this.touchScrollSpeedY = 0;
          }
        }
        try {
          this.dopaint();
          if (this.rows) {
            this.repaintDoneSubject.next();
          }
        } catch (e) {
          console.log(e);
        }

        if (Math.abs(this.touchScrollSpeedY) > 0) {
          // Continue scrolling while we have scroll speed
          this.hasChanges = true;
        } else {
          this.hasChanges = false;
        }
      }
      window.requestAnimationFrame(() => paintLoop());
    };

    this._ngZone.runOutsideAngular(() =>
      window.requestAnimationFrame(() => paintLoop())
    );
  }

  private updateDragImage(selectedRowIndex: number) {
    const dragImageYCoords: number[][] = [];
    let dragImageDestY = 0;

    // FIXME move to message_display??
    this.rows.rows
      .forEach((row, ndx) => {
        if (
          ndx >= this.topindex && (ndx - this.topindex) <= (this.canv.height / this.rowheight)
          &&
          (this.rows.isSelectedRow(ndx) || ndx === selectedRowIndex)
        ) {
          const dragImageDataY = Math.floor((ndx - this.topindex) * this.rowheight);
          dragImageYCoords.push([dragImageDataY, dragImageDestY]);

          dragImageDestY += this.rowheight;
        }
      });

    const dragImageCanvas = document.getElementById('thedragimage') as HTMLCanvasElement;
    dragImageCanvas.width = this.canv.width - 20;
    dragImageCanvas.height = dragImageYCoords.length * this.rowheight;

    const dragContext = dragImageCanvas.getContext('2d');
    dragImageYCoords.forEach(ycoords =>
      dragContext.drawImage(this.canv,
        0, ycoords[0], this.canv.width - 20, this.rowheight,
        0,
        ycoords[1],
        this.canv.width - 20, this.rowheight
      ));

    // const dragImage = document.getElementById('thedragimage') as HTMLImageElement;
    // dragImage.src = dragImageCanvas.toDataURL();
  }

  public dragColumnOverlay(event: DragEvent) {
    const canvrect = this.canv.getBoundingClientRect();
    const selectedColIndex = this.getColIndexByClientX(event.clientX - canvrect.left);
    const selectedRowIndex = this.getRowIndexByClientY(event.clientY);

    if (!this.columns[selectedColIndex].checkbox) {
      event.dataTransfer.dropEffect = 'move';
      event.dataTransfer.setDragImage(document.getElementById('thedragimage'), 0, 0);
      event.dataTransfer.setData('text/plain', 'rowIndex:' + selectedRowIndex);
      this.selectListener.rowSelected(selectedRowIndex, -1);
    } else {
      event.preventDefault();
      this.lastMouseDownEvent = event;
    }

    this.hasChanges = true;
  }

  public columnOverlayClicked(event: MouseEvent) {
    this.lastMouseDownEvent = null;
    this.selectRow(event.clientX, event.clientY);
  }

  public doScrollBarDrag(clientY: number) {
    const canvrect = this.canv.getBoundingClientRect();
    this.topindex = this.rows.rowCount() * ((clientY - canvrect.top) / this.canv.scrollHeight);

    this.enforceScrollLimit();
  }

  private getRowIndexByClientY(clientY: number) {
    const canvrect = this.canv.getBoundingClientRect();
    return Math.floor(this.topindex + (clientY - canvrect.top) / this.rowheight);
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

  public updateVisibleColumnSeparatorIndex(clientX: number) {
    let x = -this.horizScroll;
    let selectedColIndex = 0;
    for (; selectedColIndex < this.columns.length; selectedColIndex++) {
      const col = this.columns[selectedColIndex];
      if (clientX >= x - 5 && clientX < x + 5) {
        break;
      }
      x += col.width;
    }
    if (selectedColIndex === this.columns.length) {
      selectedColIndex = -1;
    }

    if (selectedColIndex !== this.visibleColumnSeparatorIndex && !this.rowWrapMode) {
      if (selectedColIndex > 0) {
        this.canv.style.cursor = 'col-resize';
      } else {
        this.canv.style.cursor = 'pointer';
      }
      this.visibleColumnSeparatorAlpha = 0;
      this.visibleColumnSeparatorIndex = selectedColIndex;
      this.hasChanges = true;
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

  public selectRow(clientX: number, clientY: number, multiSelect?: boolean) {
    const selectedRowIndex = this.getRowIndexByClientY(clientY);
    this.selectRowByIndex(clientX, selectedRowIndex, multiSelect);
  }

  public selectRowByIndex(clientX: number, selectedRowIndex: number, multiSelect?: boolean) {
    const canvrect = this.canv.getBoundingClientRect();
    clientX -= canvrect.left;

    this.selectListener.rowSelected(selectedRowIndex,
      this.getColIndexByClientX(clientX),
      multiSelect);

    this.updateDragImage(selectedRowIndex);
    this.hasChanges = true;
  }

  public autoAdjustColumnWidths(minwidth: number, tryFitScreenWidth = false) {
    if (!this.canv || this._columns.length === 0) {
      return;
    }

    const canvasWidth = Math.floor(this.wantedCanvasWidth / window.devicePixelRatio) - this.scrollbarwidth - 2;

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
    this.enforceScrollLimit();
    this.hasChanges = true;
  }

  public scrollDown() {
    this.topindex++;
    this.enforceScrollLimit();
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
    this.enforceScrollLimit();
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
      this.enforceScrollLimit();
    }
  }

  private enforceScrollLimit() {
    if (this.topindex < 0) {
      this.topindex = 0;
    } else if (this.rows && this.rows.rowCount() < this.maxVisibleRows) {
      this.topindex = 0;
    } else if (this.rows && this.topindex + this.maxVisibleRows > this.rows.rowCount()) {
      this.topindex = this.rows.rowCount() - this.maxVisibleRows;
      // send max rows hit events (use to fetch more data)
      this.scrollLimitHit.next(this.rows.rowCount());
    }


    const columnsTotalWidth = this.columns.reduce((width, col) =>
      col.width + width, 0);

    if (this.horizScroll < 0) {
      this.horizScroll = 0;
    } else if (
      this.canv.scrollWidth < columnsTotalWidth &&
      this.horizScroll + this.canv.scrollWidth > columnsTotalWidth) {
      this.horizScroll = columnsTotalWidth - this.canv.scrollWidth;
    }
  }

  /**
   * Draws a rounded rectangle using the current state of the canvas.
   * If you omit the last three params, it will draw a rectangle
   * outline with a 5 pixel border radius
   * @param {CanvasRenderingContext2D} ctx
   * @param {Number} x The top left x coordinate
   * @param {Number} y The top left y coordinate
   * @param {Number} width The width of the rectangle
   * @param {Number} height The height of the rectangle
   * @param {Number} [radius = 5] The corner radius; It can also be an object
   *                 to specify different radii for corners
   * @param {Number} [radius.tl = 0] Top left
   * @param {Number} [radius.tr = 0] Top right
   * @param {Number} [radius.br = 0] Bottom right
   * @param {Number} [radius.bl = 0] Bottom left
   * @param {Boolean} [fill = false] Whether to fill the rectangle.
   * @param {Boolean} [stroke = true] Whether to stroke the rectangle.
   */
  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number,
    width: number, height: number,
    radius?: any, fill?: boolean, stroke?: boolean) {
    if (typeof stroke === 'undefined') {
      stroke = true;
    }
    if (typeof radius === 'undefined') {
      radius = 5;
    }
    if (typeof radius === 'number') {
      radius = { tl: radius, tr: radius, br: radius, bl: radius };
    } else {
      const defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
      Object.keys(defaultRadius).forEach(side =>
        radius[side] = radius[side] || defaultRadius[side]);
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (fill) {
      ctx.fill();
    }
    if (stroke) {
      ctx.stroke();
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

  private dopaint() {
    const devicePixelRatio = window.devicePixelRatio;
    if (this.canv.width !== this.wantedCanvasWidth ||
      this.canv.height !== this.wantedCanvasHeight) {

      const widthChanged = this.canv.width !== this.wantedCanvasWidth;
      /* Only resize on detection of width change
       * otherwise reducing column widths so that the scrollbar
       * disappears indicates a change of height and triggers resize
       */

      this.canv.style.width = (this.wantedCanvasWidth / devicePixelRatio) + 'px';
      this.canv.style.height = (this.wantedCanvasHeight / devicePixelRatio) + 'px';

      this.canv.width = this.wantedCanvasWidth;
      this.canv.height = this.wantedCanvasHeight;

      this.maxVisibleRows = this.canv.scrollHeight / this.rowheight;
      this.enforceScrollLimit();
      this.hasChanges = true;
      if (this.canv.clientWidth < this.autoRowWrapModeWidth) {
        this.rowWrapMode = true;
      } else {
        this.rowWrapMode = false;
      }

      this.canvasResizedSubject.next(widthChanged);
    }

    if (devicePixelRatio !== 1) {
      // This is not scale() as that would keep multiplying
      // Moved out of above if() statement as something (!?)
      // was resetting transform, still not sure what
      this.ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }

    this.ctx.textBaseline = 'middle';
    this.ctx.font = this.fontheight + 'px ' + this.fontFamily;

    const canvwidth: number = this.canv.scrollWidth;
    const canvheight: number = this.canv.scrollHeight;

    let colx = 0 - this.horizScroll;
    // Columns
    for (let colindex = 0; colindex < this.columns.length; colindex++) {
      const col: CanvasTableColumn = this.columns[colindex];
      if (colx + col.width > 0 && colx < canvwidth) {
        this.ctx.fillStyle = col.backgroundColor ? col.backgroundColor : '#fff';
        this.ctx.fillRect(colx,
          0,
          colindex === this.columns.length - 1 ?
            canvwidth - colx :
            col.width,
          canvheight
        );
      }
      colx += col.width;
    }

    if (!this.rows || this.rows.rowCount() < 1) {
      return;
    }

    // Rows
    for (let n = this.topindex; n < this.rows.rowCount(); n += 1.0) {
      const rowIndex = Math.floor(n);

      if (rowIndex > this.rows.rowCount()) {
        break;
      }

//      const rowobj = this.rows[rowIndex];

      const halfrowheight = (this.rowheight / 2);
      const rowy = (rowIndex - this.topindex) * this.rowheight;
      if (this.rows.rowExists(rowIndex)) {
        // Clear row area
        // Alternating row colors:
        // let rowBgColor : string = (rowIndex%2===0 ? "#e8e8e8" : "rgba(255,255,255,0.7)");
        // Single row color:
        let rowBgColor = '#fff';

        const isBoldRow = this.rows.isBoldRow(rowIndex);
        const isSelectedRow = this.rows.isSelectedRow(rowIndex);
        const isOpenedRow = this.rows.isOpenedRow(rowIndex);
        if (this.hoverRowIndex === rowIndex) {
          rowBgColor = this.hoverRowColor;
        }
        if (isSelectedRow) {
          rowBgColor = this.selectedRowColor;
        }
        if (isOpenedRow) {
          rowBgColor = this.openedRowColor;
        }

        this.ctx.fillStyle = rowBgColor;
        this.ctx.fillRect(0, rowy, canvwidth, this.rowheight);

        // Row borders separating each row 
        this.ctx.strokeStyle = '#eee';
        this.ctx.beginPath();
        this.ctx.moveTo(0, rowy);
        this.ctx.lineTo(canvwidth, rowy);
        this.ctx.stroke();

        let x = 0;
        for (let colindex = 0; colindex < this.columns.length; colindex++) {
          const col: CanvasTableColumn = this.columns[colindex];
          let val: any = col.getValue(rowIndex);
          if (val === 'RETRY') {
            // retry later if value is null
            setTimeout(() => this.hasChanges = true, 2);
            val = '';
          }
          let formattedVal: string;
          const formattedValueCacheKey: string = col.cacheKey + ':' + val;
          if (this.formattedValueCache[formattedValueCacheKey]) {
            formattedVal = this.formattedValueCache[formattedValueCacheKey];
          } else if (('' + val).length > 0 && col.getFormattedValue) {
            formattedVal = col.getFormattedValue(val);
            this.formattedValueCache[formattedValueCacheKey] = formattedVal;
          } else {
            formattedVal = '' + val;
            this.formattedValueCache[formattedValueCacheKey] = formattedVal;
          }
          if (this.rowWrapMode && col.rowWrapModeHidden) {
            continue;
          } else if (this.rowWrapMode && col.rowWrapModeChipCounter && parseInt(val, 10) > 1) {
            this.ctx.save();

            this.ctx.strokeStyle = '';

            this.roundRect(this.ctx,
              canvwidth - 50,
              rowy + 9,
              28,
              15, 10, false);
            this.ctx.font = '10px ' + this.fontFamily;

            this.ctx.strokeStyle = '#000';
            if (isSelectedRow) {
              this.ctx.fillStyle = this.textColor;
            } else {
              this.ctx.fillStyle = this.textColor;
            }
            this.ctx.textAlign = 'center';
            this.ctx.fillText(formattedVal + '', canvwidth - 36, rowy + halfrowheight - 15);

            this.ctx.restore();

            continue;
          } else if (this.rowWrapMode && col.rowWrapModeChipCounter) {
            continue;
          }
          if (this.rowWrapMode && colindex === this.rowWrapModeWrapColumn) {
            x = 0;
          }

          x += this.colpaddingleft;

          if ((x - this.horizScroll + col.width) >= 0 && formattedVal.length > 0) {
            this.ctx.fillStyle = this.textColor; // Text color of unselected row
            if (isSelectedRow) {
              this.ctx.fillStyle = this.textColor; // Text color of selected row
            }

            if (this.rowWrapMode) {
              // Wrap rows if in row wrap mode (for e.g. mobile portrait view)

              // Check box
              const texty: number = rowy + halfrowheight;
              const textx: number = x - this.horizScroll;

              const width = col.width - this.colpaddingright - this.colpaddingleft;

              this.ctx.save();
              this.ctx.beginPath();
              this.ctx.moveTo(textx, rowy);
              this.ctx.lineTo(textx + width, rowy);
              this.ctx.lineTo(textx + width, rowy + this.rowheight);
              this.ctx.lineTo(textx, rowy + this.rowheight);
              this.ctx.closePath();

              if (col.checkbox) {
                const checkboxWidthHeight = 12;
                const checkboxCheckedPadding = 3;
                const checkboxLeftPadding = 4;
                this.ctx.strokeStyle = this.textColor;
                this.ctx.beginPath();
                this.ctx.rect(checkboxLeftPadding + textx, texty - checkboxWidthHeight / 2, checkboxWidthHeight, checkboxWidthHeight);
                this.ctx.stroke();
                if (val) {
                  this.ctx.beginPath();
                  this.ctx.rect(checkboxLeftPadding + textx + checkboxCheckedPadding,
                    checkboxCheckedPadding + texty - checkboxWidthHeight / 2,
                    checkboxWidthHeight - checkboxCheckedPadding * 2,
                    checkboxWidthHeight - checkboxCheckedPadding * 2);
                  this.ctx.fill();
                }
              } else {

                // Other columns
                if (colindex >= this.rowWrapModeWrapColumn) {
                  // Subject
                  x += 30; // Increase padding before Subject
                  this.ctx.save();
                  if (isBoldRow) {
                    this.ctx.save();
                    this.ctx.font = 'bold ' + this.fontheight + 'px ' + this.fontFamilyBold;
                    this.ctx.fillStyle = this.textColorLink;
                  } else {
                    this.ctx.save();
                    this.ctx.font = this.fontheight + 'px ' + this.fontFamily;
                    this.ctx.fillStyle = this.textColorLink;
                  }
                  this.ctx.fillText(formattedVal, x, rowy + halfrowheight + 12
                        - (this.showContentTextPreview ? 12 : 0)
                      );
                  this.ctx.restore();
                } else if (col.rowWrapModeMuted) {
                  // Date/time
                  x = 42; // sufficiently away from the checkbox
                  this.ctx.save();
                  this.ctx.font = this.fontheightSmaller + 'px ' + this.fontFamily;
                  this.ctx.fillStyle = this.textColor;
                  this.ctx.fillText(formattedVal, x, rowy + halfrowheight - 10
                    - (this.showContentTextPreview ? 8 : 0)
                    );
                  this.ctx.restore();
                } else {
                  x = 128; // far enough to make the date above fit nicely
                  this.ctx.font = this.fontheightSmall + 'px ' + this.fontFamily;
                  this.ctx.fillText(formattedVal, x, rowy + halfrowheight - 10
                    - (this.showContentTextPreview ? 8 : 0));
                  this.ctx.fillStyle = this.textColorLink;
                }
              }
              this.ctx.restore();
            } else if (x - this.horizScroll < canvwidth) {
              // Normal no-wrap mode

              // Check box
              const texty: number = rowy + halfrowheight - (this.showContentTextPreview ? 10 : 0);
              let textx: number = x - this.horizScroll;

              const width = col.width - this.colpaddingright - this.colpaddingleft;

              this.ctx.save();
              this.ctx.beginPath();
              this.ctx.moveTo(textx, rowy);
              this.ctx.lineTo(textx + width, rowy);
              this.ctx.lineTo(textx + width, rowy + this.rowheight);
              this.ctx.lineTo(textx, rowy + this.rowheight);
              this.ctx.closePath();

              this.ctx.clip();

              if (col.checkbox) {
                const checkboxWidthHeight = 12;
                const checkboxCheckedPadding = 3;
                const checkboxLeftPadding = 4;
                this.ctx.strokeStyle = this.textColor;
                this.ctx.beginPath();
                this.ctx.rect(checkboxLeftPadding + textx, texty - checkboxWidthHeight / 2, checkboxWidthHeight, checkboxWidthHeight);
                this.ctx.stroke();
                if (val) {
                  this.ctx.beginPath();
                  this.ctx.rect(checkboxLeftPadding + textx + checkboxCheckedPadding,
                    checkboxCheckedPadding + texty - checkboxWidthHeight / 2,
                    checkboxWidthHeight - checkboxCheckedPadding * 2,
                    checkboxWidthHeight - checkboxCheckedPadding * 2);
                  this.ctx.fill();
                }
              } else {
                // Other columns
                if (col.textAlign === 1) {
                  textx += width;
                  this.ctx.textAlign = 'end';
                }

                if (col.font) {
                  this.ctx.font = col.font;
                }
                if (colindex === 2 || colindex === 3) {
                  // Column 2 is From, 3 is Subject
                  this.ctx.fillStyle = this.textColorLink;
                  if (isBoldRow) {
                    this.ctx.font = 'bold ' + this.fontheight + 'px ' + this.fontFamilyBold;
                  }
                }
                this.ctx.fillText(formattedVal, textx, texty);
              }
              this.ctx.restore();
            }
          }

          x += (Math.round(col.width * (this.rowWrapMode && col.rowWrapModeMuted ?
            (10 / this.fontheight) : 1)) - this.colpaddingleft); // We've already added colpaddingleft above
        }
      } else {
        // skipping rows we've removed while canvas was updating....
        console.log('Skipped repainting a row as its data is missing, continuing anyway');
      }
      if (this.showContentTextPreview) {
        const contentTextPreviewColumn = this.columns
          .find(col => col.getContentPreviewText ? true : false);
        if (contentTextPreviewColumn) {
          const contentPreviewText = contentTextPreviewColumn.getContentPreviewText(rowIndex);
          if (contentPreviewText) {
            this.ctx.save();
            this.ctx.fillStyle = this.textColor;
            this.ctx.font = this.fontheightSmaller + 'px ' + this.fontFamily;
          const contentTextPreviewColumnPadding = this.rowWrapMode ? 2 : 10; // Increase left padding of content preview
            this.ctx.fillText(contentPreviewText, this.columns[0]. width + contentTextPreviewColumnPadding,
              rowy + halfrowheight + (this.rowWrapMode ? 18 : 15));
            this.ctx.restore();
          }
        }
      }

      if (rowy > canvheight) {
        break;
      }
      this.ctx.fillStyle = this.textColor;

    }

    // Column separators

    if (!this.rowWrapMode) {
      // No column separators in row wrap mode
      this.ctx.fillStyle = `rgba(166,166,166,${this.visibleColumnSeparatorAlpha})`;
      this.ctx.strokeStyle = `rgba(176,176,176,${this.visibleColumnSeparatorAlpha})`;

      if (this.visibleColumnSeparatorAlpha < 1) {
        this.visibleColumnSeparatorAlpha += 0.01;
        setTimeout(() => this.hasChanges = true, 0);
      }

      let x = 0;
      for (let colindex = 0; colindex < this.columns.length; colindex++) {
        if (colindex > 0 && this.visibleColumnSeparatorIndex === colindex) {
          // Only draw column separator near the mouse pointer
          this.ctx.beginPath();
          this.ctx.moveTo(x - this.horizScroll, 0);
          this.ctx.lineTo(x - this.horizScroll, canvheight);
          this.ctx.stroke();

          this.ctx.fillRect(x - this.horizScroll - 5, this.lastClientY - 10, 10, 20);
        }
        x += this.columns[colindex].width;
      }
    }

    // Scrollbar
    let scrollbarheight = (this.maxVisibleRows / this.rows.rowCount()) * canvheight;
    if (scrollbarheight < 20) {
      scrollbarheight = 20;
    }
    const scrollbarpos =
      (this.topindex / (this.rows.rowCount() - this.maxVisibleRows)) * (canvheight - scrollbarheight);

    if (scrollbarheight < canvheight) {
      const scrollbarverticalpadding = 4;

      const scrollbarx = canvwidth - this.scrollbarwidth;
      this.ctx.fillStyle = '#aaa';
      this.ctx.fillRect(scrollbarx, 0, this.scrollbarwidth, canvheight);
      this.ctx.fillStyle = '#fff';
      this.scrollBarRect = {
        x: scrollbarx + 1,
        y: scrollbarpos + scrollbarverticalpadding / 2,
        width: this.scrollbarwidth - 2,
        height: scrollbarheight - scrollbarverticalpadding
      };

      if (this.scrollbarDragInProgress) {
        this.ctx.fillStyle = 'rgba(200,200,255,0.5)';
        this.roundRect(this.ctx,
          this.scrollBarRect.x - 4,
          this.scrollBarRect.y - 4,
          this.scrollBarRect.width + 8,
          this.scrollBarRect.height + 8, 5, true);

        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(this.scrollBarRect.x,
          this.scrollBarRect.y,
          this.scrollBarRect.width,
          this.scrollBarRect.height);
      } else {
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(this.scrollBarRect.x, this.scrollBarRect.y, this.scrollBarRect.width, this.scrollBarRect.height);
      }

    }

  }
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'canvastablecontainer',
  templateUrl: 'canvastablecontainer.component.html',
  moduleId: 'angular2/app/canvastable/',
  styleUrls: ['canvastablecontainer.component.scss']
})
export class CanvasTableContainerComponent implements OnInit {
  colResizeInitialClientX: number;
  colResizeColumnIndex: number;
  colResizePreviousWidth: number;

  columnResized: boolean;
  sortColumn = 0;
  sortDescending = false;

  columnWidths = {};

  @Input() configname = 'default';
  @Input() canvastableselectlistener: CanvasTableSelectListener;

  @Output() sortToggled: EventEmitter<any> = new EventEmitter();

  @ViewChild(CanvasTableComponent, { static: true  }) canvastable:        CanvasTableComponent;
  @ViewChild('tablecontainer') tablecontainer:     ElementRef<HTMLDivElement>;
  @ViewChild('tablebodycontainer') tablebodycontainer: ElementRef<HTMLDivElement>;
  @ViewChild(MatMenuTrigger) trigger: MatMenuTrigger;

  RowSelect = CanvasTable.RowSelect;
  private selectAllTimeout;

  constructor(private renderer: Renderer2) {
    const oldSavedColumnWidths = localStorage.getItem('canvasNamedColumnWidths');
    if (oldSavedColumnWidths) {
      const colWidthSet = Object.keys(JSON.parse(oldSavedColumnWidths)).filter((col) => col.length > 0).join(',');
      const newColWidths = {};
      newColWidths[colWidthSet] = JSON.parse(oldSavedColumnWidths);
      localStorage.setItem('canvasNamedColumnWidthsBySet', JSON.stringify(newColWidths));
      localStorage.removeItem('canvasNamedColumnWidths');
    }

    const savedColumnWidths = localStorage.getItem('canvasNamedColumnWidthsBySet');
    if (savedColumnWidths) {
      this.columnWidths = JSON.parse(savedColumnWidths);
    }
  }

  saveColumnWidths() {
    const newColWidths = {};
    const colWidthSet = this.canvastable.columns.map((col) => col.name).filter((cname) => cname.length > 0).join(',');
    for (const c of this.canvastable.columns) {
      newColWidths[c.name] = c.width;
    }
    this.columnWidths[colWidthSet] = newColWidths;
    localStorage.setItem('canvasNamedColumnWidthsBySet', JSON.stringify(this.columnWidths));
  }

  ngOnInit() {
    this.renderer.listen('window', 'mousemove', (event: MouseEvent) => {
      if (this.colResizeInitialClientX) {
        event.preventDefault();
        event.stopPropagation();
        this.colresize(event.clientX);
      }
    });

    this.renderer.listen('window', 'mouseup', (event: MouseEvent) => {
      if (this.colResizeInitialClientX) {
        event.preventDefault();
        event.stopPropagation();
        this.colresizeend();
      }
    });
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
