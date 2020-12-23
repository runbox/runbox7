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
import { CanvasTableColumn } from '../canvastable/canvastablecolumn';
import { AppComponent } from '../app.component';

export abstract class MessageDisplay {
  public openedRowIndex: number;
  public selectedRowId: number;
//  public openedRowId: number;
  public selectedRowIds: { [key: number]: boolean } = {};
  public hasChanges: boolean;

  public rows = [];

  constructor(rows: any) {
    this.rows = rows;
  }

  // rows:
  rowCount(): number {
    return this.rows.length;
  }

  selectedMessageIds(): number[] {
    return Object.keys(this.selectedRowIds).map((rowIndex) => this.getRowMessageId(parseInt(rowIndex, 10)));
  }

  allSelected(): boolean {
    return Object.keys(this.selectedRowIds).filter((key) => this.selectedRowIds[key]).length === this.rows.length;
  }

  // public selectPreviousRow() {
  //   const newRowIndex = this.openedRowIndex - 1;
  //   if (newRowIndex >= 0) {

  //   }
  // }

  public getCurrentRow(): any {
    return this.rows[this.openedRowIndex];
  }

  public findRowByMessageId(messageId: number) {
    return this.rows.findIndex((element, index) => {
      return this.getRowMessageId(index) === messageId;
    });
  }

  public rowSelected(rowIndex: number, columnIndex: number, multiSelect?: boolean) {
    this.hasChanges = false;
    if (!this.rowExists(rowIndex)) {
      return;
    }
    //    const selectedRowId = this.getRowId(rowIndex);
    const selectedRowId = rowIndex;

    // multiSelect just means do these, nothing else:
    // multiSelect is true if we're applying rowSelect in a loop
    this.selectedRowId = selectedRowId;

    // flip sense of selected row (deleted below if now false)
    if (columnIndex >= -1) {
      this.selectedRowIds[this.selectedRowId] = !this.selectedRowIds[this.selectedRowId];
    }
    if (multiSelect) {
      // MS is a special snowflake:
      this.selectedRowIds[this.selectedRowId] = true;
      return;
    }

    // click anywhere on a row right of the checkbox, reset the selected rows
    // as we want to open the email instead
    if (columnIndex > 0) {
      this.selectedRowIds = {};
    }

    // columnIndex == -1 if drag & drop
    // columnIndex == 0 is the checkbox
    // we're removing this one from the selected list (sense reversed
    // above, but we only remove when not in multiSelect mode)
    if (columnIndex === 0 && !this.selectedRowIds[this.selectedRowId]) {
      this.selectedRowId = null;
      delete this.selectedRowIds[selectedRowId];
    }

    // If we clicked right of the checkbox, we wanted to open the email:
    if (columnIndex > 0) {
      // selectedRow will change when we click on other checkboxes, this one
      // stays attached to the opened email
//      this.openedRowId = this.selectedRowId;
      this.openedRowIndex = rowIndex;

      this.hasChanges = true;
    }
  }

  // row entries
  abstract getRowSeen(index: number): boolean;
  abstract getRowId(index: number): number;
  abstract getRowMessageId(index: number): number;

  public getRow(index: number): any {
    return this.rows[index];
  }

  rowExists(index: number): boolean {
    return this.rows[index] ? true : false;
  }

  isBoldRow(index: number): boolean {
    return this.getRowSeen(index);
  }

  isSelectedRow(index: number): boolean {
    return this.selectedRowIds[index] === true;
  }

  isOpenedRow(index: number): boolean {
    return index === this.openedRowIndex;
  }

  clearSelection() {
    this.selectedRowId = null;
    this.selectedRowIds = {};
//    this.openedRowIndex = null;
  }

  clearOpenedRow() {
    this.openedRowIndex = null;
  }

  // columns
  abstract getCanvasTableColumns(app: AppComponent): CanvasTableColumn[];
}
