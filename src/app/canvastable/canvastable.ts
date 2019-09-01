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

/*
 *  Copyright 2010-2018 FinTech Neo AS / Runbox ( fintechneo.com / runbox.com )- All rights reserved
 */


import {
  NgModule, Component, QueryList, AfterViewInit,
  Input, Output, Renderer,
  ElementRef,
  DoCheck, NgZone, EventEmitter, OnInit, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule, MatTooltip, MatIconModule, MatButtonModule } from '@angular/material';
import { BehaviorSubject ,  Subject } from 'rxjs';

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

export class AnimationFrameThrottler {

  static taskMap: { [key: string]: Function } = null;
  static hasChanges = false;
  static mainLoop() {
    AnimationFrameThrottler.taskMap = {};

    const mainLoop = () => {
      if (AnimationFrameThrottler.hasChanges) {
        AnimationFrameThrottler.hasChanges = false;
        Object.keys(AnimationFrameThrottler.taskMap).forEach(
          (key) => {
            AnimationFrameThrottler.taskMap[key]();
            delete AnimationFrameThrottler.taskMap[key];
          });
      }
      window.requestAnimationFrame(() => mainLoop());
    };
    window.requestAnimationFrame(() => mainLoop());
  }

  constructor(private taskkey: string, private task: Function) {
    if (!AnimationFrameThrottler.taskMap) {
      AnimationFrameThrottler.mainLoop();
    }
    AnimationFrameThrottler.taskMap[taskkey] = task;
    AnimationFrameThrottler.hasChanges = true;
  }
}

export interface CanvasTableSelectListener {
  rowSelected(rowIndex: number, colIndex: number, rowContent: any, multiSelect?: boolean): void;
  isSelectedRow(rowObj: any): boolean;
  isBoldRow(rowObj: any): boolean;
}

export interface CanvasTableColumn {
  name: string;
  columnSectionName?: string;
  footerText?: string;

  width: number;
  originalWidth?: number;
  font?: string;
  backgroundColor?: string;
  tooltipText?: string | ((rowobj: any) => string);
  draggable?: boolean;
  sortColumn: number;
  excelCellAttributes?: any;
  rowWrapModeHidden?: boolean;
  rowWrapModeMuted?: boolean;
  rowWrapModeChipCounter?: boolean; // E.g. for displaying number of messages in conversation in a "chip"/"badge"
  checkbox?: boolean; // checkbox for selecting rows
  textAlign?: number; // default = left, 1 = right, 2 = center
  getContentPreviewText?: (rowobj: any) => string;

  compareValue?: (a: any, b: any) => number;
  setValue?: (rowobj: any, val: any) => void;
  getValue(rowobj: any): any;

  footerSumReduce?(prev: number, curr: number): number;
  getFormattedValue?(val: any): string;
}

export class FloatingTooltip {
  constructor(public top: number,
    public left: number,
    public width: number,
    public height: number,
    public tooltipText: string) {

  }
}

export class CanvasTableColumnSection {
  constructor(
    public columnSectionName: string,
    public width: number,
    public leftPos: number,
    public backgroundColor: string) {

  }
}

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'canvastable',
  moduleId: 'angular2/app/canvastable/',
  templateUrl: 'canvastable.component.html'
})
export class CanvasTableComponent implements AfterViewInit, DoCheck {
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

  private _rowheight = 36;
  private fontheight = 16;
  private fontheightSmaller = 13;
  private fontheightSmall = 15;
  private fontheightLarge = 18;

  private scrollbarwidth = 12;

  public fontFamily = '"Avenir Next Pro Regular", "Helvetica Neue", sans-serif';
  public fontFamilyBold = '"Avenir Next Pro Medium", "Helvetica Neue", sans-serif';

  private maxVisibleRows: number;

  private scrollBarRect: any;

  private isTouchZoom = false;
  private touchdownxy: any;
  private scrollbarDragInProgress = false;
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

  public _rows: any[] = [];

  public hasSortColumns = false;
  public _columns: CanvasTableColumn[] = [];
  public get columns(): CanvasTableColumn[] { return this._columns; }
  public set columns(columns: CanvasTableColumn[]) {
    if (this._columns !== columns) {
      this._columns = columns;
      this.recalculateColumnSections();
      this.calculateColumnFooterSums();
      this.hasSortColumns = columns.filter(col => col.sortColumn !== null).length > 0;
      this.hasChanges = true;
    }
  }

  // Colors retrieved from css classes
  textColorLink: string = getCSSClassProperty('themePalettePrimary', 'color');
  selectedRowColor: string = getCSSClassProperty('themePaletteAccentLighter', 'color');
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

  public columnSections: CanvasTableColumnSection[] = [];

  public scrollLimitHit: BehaviorSubject<number> = new BehaviorSubject(0);

  public floatingTooltip: FloatingTooltip;

  @Input() selectListener: CanvasTableSelectListener;
  @Output() touchscroll = new EventEmitter();

  touchScrollSpeedY = 0;

  constructor(elementRef: ElementRef, private renderer: Renderer, private _ngZone: NgZone) {

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

  ngAfterViewInit() {
    this.canv = this.canvRef.nativeElement;
    this.ctx = this.canv.getContext('2d');

    this.canv.onwheel = (event: MouseWheelEvent) => {
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
      this.touchdownxy = { x: clientX - canvrect.left, y: clientY - canvrect.top };
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

      this.canv.focus(); // Take away focus from search field
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

    this.renderer.listenGlobal('window', 'mousemove', (event: MouseEvent) => {
      if (this.scrollbarDragInProgress === true) {
        event.preventDefault();
        this.doScrollBarDrag(event.clientY);
      }
    });

    this.canv.onmousemove = (event: MouseEvent) => {
      if (this.scrollbarDragInProgress === true) {
        event.preventDefault();
        return;
      }

      const canvrect = this.canv.getBoundingClientRect();
      const clientX = event.clientX - canvrect.left;

      let newHoverRowIndex = Math.floor(this.topindex + (event.clientY - canvrect.top) / this.rowheight);
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

        let tooltipText: string | ((rowobj: any) => string) =
              this.columns[colIndex] && this.columns[colIndex].tooltipText;

        if (typeof tooltipText === 'function' && this.rows[this.hoverRowIndex]) {
          tooltipText = tooltipText(this.rows[this.hoverRowIndex]);
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

    this.renderer.listenGlobal('window', 'mouseup', (event: MouseEvent) => {
      this.touchdownxy = undefined;
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
      } else if (!this.scrollbarArea &&
        this.lastMouseDownEvent &&
        event.clientX === this.lastMouseDownEvent.clientX &&
        event.clientY === this.lastMouseDownEvent.clientY) {
        this.selectRow(event.clientX, event.clientY);
      }

      this.lastMouseDownEvent = null;
      this.dragSelectionDirectionIsDown = null;
    };


    this.renderer.listenGlobal('window', 'resize', () => true);

    const paintLoop = () => {
      if (this.hasChanges) {
        if (Math.abs(this.touchScrollSpeedY) > 0) {
          // Scroll if speed
          this.topindex -= this.touchScrollSpeedY / this.rowheight;

          // ---- Enforce scroll limit
          if (this.topindex < 0) {
            this.topindex = 0;
          } else if (this.rows.length < this.maxVisibleRows) {
            this.topindex = 0;
          } else if (this.topindex + this.maxVisibleRows > this.rows.length) {
            this.topindex = this.rows.length - this.maxVisibleRows;
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
          this.repaintDoneSubject.next();
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
    const canvrect = this.canv.getBoundingClientRect();

    const dragImageYCoords: number[][] = [];
    let dragImageDestY = 0;

    this.rows
      .forEach((row, ndx) => {
        if (
          ndx >= this.topindex && (ndx - this.topindex) <= (this.canv.height / this.rowheight)
          &&
          (this.selectListener.isSelectedRow(row) || ndx === selectedRowIndex)
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
    const selectedRowIndex = Math.floor(this.topindex + (event.clientY - canvrect.top) / this.rowheight);

    if (!this.columns[selectedColIndex].checkbox) {
      event.dataTransfer.dropEffect = 'move';
      event.dataTransfer.setDragImage(document.getElementById('thedragimage'), 0, 0);
      event.dataTransfer.setData('text/plain', 'rowIndex:' + selectedRowIndex);
      this.selectListener.rowSelected(selectedRowIndex, -1, this.rows[selectedRowIndex]);
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
    this.topindex = this.rows.length * ((clientY - canvrect.top) / this.canv.scrollHeight);

    this.enforceScrollLimit();
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

    if (selectedColIndex !== this.visibleColumnSeparatorIndex) {
      if (selectedColIndex > 0) {
        this.canv.style.cursor = 'col-resize';
      } else {
        this.canv.style.cursor = 'default';
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

  public selectAllVisibleRows() {
    const visibleRowIndexes = this.getVisibleRowIndexes();

    const visibleRowsAlreadySelected = visibleRowIndexes.reduce((prev, next) =>
      prev &&
      (next >= this.rows.length || this.selectListener.isSelectedRow(this.rows[next]))
      , true);

    visibleRowIndexes.forEach(selectedRowIndex =>
      this.selectListener.rowSelected(selectedRowIndex,
        0,
        this.rows[selectedRowIndex],
        !visibleRowsAlreadySelected)
    );

    this.hasChanges = true;
  }

  public selectRow(clientX: number, clientY: number, multiSelect?: boolean) {
    const canvrect = this.canv.getBoundingClientRect();
    const selectedRowIndex = Math.floor(this.topindex + (clientY - canvrect.top) / this.rowheight);
    this.selectRowByIndex(clientX, selectedRowIndex, multiSelect);
  }

  public selectRowByIndex(clientX: number, selectedRowIndex: number, multiSelect?: boolean) {
    const canvrect = this.canv.getBoundingClientRect();
    clientX -= canvrect.left;

    this.selectListener.rowSelected(selectedRowIndex,
      this.getColIndexByClientX(clientX),
      this.rows[selectedRowIndex],
      multiSelect);

    this.updateDragImage(selectedRowIndex);
    this.hasChanges = true;
  }

  public autoAdjustColumnWidths(minwidth: number, maxwidth: number, tryFitScreenWidth = false) {
    if (!this.canv) {
      return;
    }


    const padding = this.colpaddingleft + this.colpaddingright;

    const canvasWidth = Math.floor(this.wantedCanvasWidth / window.devicePixelRatio) - this.scrollbarwidth - 2;

    const columnsTotalWidth = () => this.columns.reduce((prev, curr) => prev + curr.width, 0);
    /*
    // Disabled measuring column widths from the contents -
    // since it causes different column widths per folder
    // Must have the correct font for measuring text
    this.ctx.font = this.fontheight + 'px ' + this.fontFamily;

    this.columns.forEach(c => {
      let newwidth = Math.round(padding + ((this.ctx.measureText(c.name).width))) + padding;
      if (newwidth > maxwidth) {
        newwidth = maxwidth;
      }
      if (newwidth > minwidth && newwidth > c.width) {
        c.width = newwidth;
      }
    });

    for (let rowindex = this.topindex; rowindex <
      this.topindex + this.canv.height / this.rowheight &&
      rowindex < this.rows.length;
      rowindex++) {
      const row = this.rows[Math.floor(rowindex)];

      this.columns.forEach(c => {
        let valueWidth = Math.round(
          ((this.ctx.measureText(
            c.getFormattedValue ?
              c.getFormattedValue(c.getValue(row)) :
              c.getValue(row) + ''
          ).width)) + padding
        );

        if (valueWidth > maxwidth) {
          valueWidth = maxwidth;
        }

        if (valueWidth > c.width) {
          c.width = valueWidth;
        }
      });

    }
    */

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

    this.recalculateColumnSections();
    this.hasChanges = true;
  }

  public scrollTop() {
    this.topindex = 0;
    this.hasChanges = true;
  }

  public get rows(): any[] {
    return this._rows;
  }

  public set rows(rows: any[]) {
    if (this._rows !== rows) {
      this._rows = rows;
      this.calculateColumnFooterSums();

      this.hasChanges = true;
    }
  }

  public get showContentTextPreview(): boolean {
    return this._showContentTextPreview;
  }

  public set showContentTextPreview(showContentTextPreview: boolean) {
    this._showContentTextPreview = showContentTextPreview;
    this.hasChanges = true;
  }

  public calculateColumnFooterSums(): void {
    this.columns.forEach((col) => {
      if (col.footerSumReduce) {
        col.footerText = col.getFormattedValue(
          this.rows.reduce((prev, row) => col.footerSumReduce(prev, col.getValue(row)), 0)
        );
      }
    });
  }

  public recalculateColumnSections(): void {
    let leftX = 0;
    this.columnSections = this.columns.reduce((accumulated, current) => {
      let ret;
      if (accumulated.length === 0 ||
        accumulated[accumulated.length - 1].columnSectionName !== current.columnSectionName) {

        ret = accumulated.concat([
          new CanvasTableColumnSection(current.columnSectionName,
            current.width,
            leftX,
            current.backgroundColor)]);
      } else if (accumulated.length > 0 && accumulated[accumulated.length - 1].columnSectionName === current.columnSectionName) {
        accumulated[accumulated.length - 1].width += current.width;
        ret = accumulated;
      }
      leftX += current.width;
      return ret;
    }, []);
    this.hasChanges = true;
  }

  private enforceScrollLimit() {
    if (this.topindex < 0) {
      this.topindex = 0;
    } else if (this.rows.length < this.maxVisibleRows) {
      this.topindex = 0;
    } else if (this.topindex + this.maxVisibleRows > this.rows.length) {
      this.topindex = this.rows.length - this.maxVisibleRows;
      // send max rows hit events (use to fetch more data)
      this.scrollLimitHit.next(this.rows.length);
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
    if (this.canv.width !== this.wantedCanvasWidth ||
      this.canv.height !== this.wantedCanvasHeight) {

      const widthChanged = this.canv.width !== this.wantedCanvasWidth;
      /* Only resize on detection of width change
       * otherwise reducing column widths so that the scrollbar
       * disappears indicates a change of height and triggers resize
       */
      const devicePixelRatio = window.devicePixelRatio;

      this.canv.style.width = (this.wantedCanvasWidth / devicePixelRatio) + 'px';
      this.canv.style.height = (this.wantedCanvasHeight / devicePixelRatio) + 'px';

      this.canv.width = this.wantedCanvasWidth;
      this.canv.height = this.wantedCanvasHeight;

      // -- Disabled scaling after moving resizing of canvas to inside paint routine
      if (devicePixelRatio !== 1) {
        this.ctx.scale(devicePixelRatio, devicePixelRatio);
      }
      this.maxVisibleRows = this.canv.scrollHeight / this.rowheight;
      this.hasChanges = true;
      if (this.canv.clientWidth < this.autoRowWrapModeWidth) {
        this.rowWrapMode = true;
      } else {
        this.rowWrapMode = false;
      }

      this.canvasResizedSubject.next(widthChanged);
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

    if (this.rows.length < 1) {
      return;
    }

    // Rows
    for (let n = this.topindex; n < this.rows.length; n += 1.0) {
      const rowIndex = Math.floor(n);

      if (rowIndex > this.rows.length) {
        break;
      }

      const rowobj = this.rows[rowIndex];

      const halfrowheight = (this.rowheight / 2);
      const rowy = (rowIndex - this.topindex) * this.rowheight;
      if (rowobj) {
        // Clear row area
        // Alternating row colors:
        // let rowBgColor : string = (rowIndex%2===0 ? "#e8e8e8" : "rgba(255,255,255,0.7)");
        // Single row color:
        let rowBgColor = '#fff';

        const isBoldRow = this.selectListener.isBoldRow(rowobj);
        const isSelectedRow = this.selectListener.isSelectedRow(rowobj);
        if (this.hoverRowIndex === rowIndex) {
          rowBgColor = this.hoverRowColor;
        }
        if (isSelectedRow) {
          rowBgColor = this.selectedRowColor;
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
          let val: any = col.getValue(rowobj);
          if (val === 'RETRY') {
            // retry later if value is null
            setTimeout(() => this.hasChanges = true, 2);
            val = '';
          }
          let formattedVal: string;
          const formattedValueCacheKey: string = colindex + ':' + val;
          if (this.formattedValueCache[formattedValueCacheKey]) {
            formattedVal = this.formattedValueCache[formattedValueCacheKey];
          } else if (('' + val).length > 0 && col.getFormattedValue) {
            formattedVal = col.getFormattedValue(val);
            this.formattedValueCache[formattedValueCacheKey] = formattedVal;
          } else {
            formattedVal = '' + val;
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
                  x -= 8; // Decrease padding before Date
                  this.ctx.save();
                  this.ctx.font = this.fontheightSmaller + 'px ' + this.fontFamily;
                  this.ctx.fillStyle = this.textColor;
                  this.ctx.fillText(formattedVal, x, rowy + halfrowheight - 10
                    - (this.showContentTextPreview ? 8 : 0)
                    );
                  this.ctx.restore();
                } else {
                  x += 10; // Increase padding before From
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
        break;
      }
      if (this.showContentTextPreview) {
        const contentTextPreviewColumn = this.columns
          .find(col => col.getContentPreviewText ? true : false);
        if (contentTextPreviewColumn) {
          const contentPreviewText = contentTextPreviewColumn.getContentPreviewText(rowobj);
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
    let scrollbarheight = (this.maxVisibleRows / this.rows.length) * canvheight;
    if (scrollbarheight < 20) {
      scrollbarheight = 20;
    }
    const scrollbarpos =
      (this.topindex / (this.rows.length - this.maxVisibleRows)) * (canvheight - scrollbarheight);

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
  // tslint:disable-next-line:component-selector
  selector: 'canvastablecontainer',
  templateUrl: 'canvastablecontainer.component.html',
  moduleId: 'angular2/app/canvastable/'
})
export class CanvasTableContainerComponent implements OnInit {
  colResizePreviousX: number;
  colResizeColumnIndex: number;
  columnResized: boolean;
  sortColumn = 0;
  sortDescending = false;

  savedColumnWidths: number[] = [];
  @Input() configname = 'default';
  @Input() canvastableselectlistener: CanvasTableSelectListener;

  @Output() sortToggled: EventEmitter<any> = new EventEmitter();

  @ViewChild(CanvasTableComponent) canvastable: CanvasTableComponent;
  @ViewChild('tablecontainer') tablecontainer: ElementRef<HTMLDivElement>;
  @ViewChild('tablebodycontainer') tablebodycontainer: ElementRef<HTMLDivElement>;

  constructor(private renderer: Renderer) {

  }

  ngOnInit() {
    const savedColumnWidthsString: string = localStorage.getItem(this.configname + 'CanvasTableColumnWidths');
    if (savedColumnWidthsString) {
      this.savedColumnWidths = JSON.parse(savedColumnWidthsString);
    }


    this.renderer.listenGlobal('window', 'mousemove', (event: MouseEvent) => {
      if (this.colResizePreviousX) {
        event.preventDefault();
        event.stopPropagation();
        this.colresize(event.clientX);
      }
    });
    this.renderer.listenGlobal('window', 'mouseup', (event: MouseEvent) => {
      if (this.colResizePreviousX) {
        event.preventDefault();
        event.stopPropagation();
        this.colresizeend();
      }
    });
  }

  colresizestart(clientX: number, colIndex: number) {
    if (colIndex > 0) {
      this.colResizePreviousX = clientX;
      this.colResizeColumnIndex = colIndex;
    }
  }

  colresize(clientX: number) {
    if (this.colResizePreviousX) {
      // tslint:disable-next-line:no-unused-expression
      new AnimationFrameThrottler('colresize', () => {
        const prevcol: CanvasTableColumn = this.canvastable.columns[this.colResizeColumnIndex - 1];
        if (prevcol && prevcol.width) {
          prevcol.width += (clientX - this.colResizePreviousX);
          if (prevcol.width < 20) {
            prevcol.width = 20;
          }
          this.canvastable.hasChanges = true;
          this.columnResized = true;
          this.colResizePreviousX = clientX;
          this.saveColumnWidths();
        }
      });
    }
  }

  public sumWidthsBefore(colIndex: number) {
    let ret = 0;
    for (let n = 0; n < colIndex; n++) {
      ret += this.canvastable.columns[n].width;
    }
    return ret;
  }

  getSavedColumnWidth(colIndex: number, defaultWidth: number): number {
    return this.savedColumnWidths[colIndex] ?
      this.savedColumnWidths[colIndex] :
      defaultWidth;
  }

  saveColumnWidths() {
    this.savedColumnWidths = this.canvastable.columns.map((col) => col.width);
    localStorage.setItem(this.configname + 'CanvasTableColumnWidths', JSON.stringify(this.savedColumnWidths));
  }

  colresizeend() {
    this.colResizePreviousX = null;
    this.colResizeColumnIndex = null;
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
}


@NgModule({
  imports: [
    CommonModule,
    MatTooltipModule,
    MatButtonModule,
    MatIconModule
  ],
  declarations: [CanvasTableComponent, CanvasTableContainerComponent],
  exports: [CanvasTableComponent, CanvasTableContainerComponent]
})
export class CanvasTableModule {

}
