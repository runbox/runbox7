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

/*
 *  Copyright 2010-2020 FinTech Neo AS / Runbox ( fintechneo.com / runbox.com )- All rights reserved
 */

export interface CanvasTableColumn {
  name: string;
  columnSectionName?: string;
  footerText?: string;

  width?: number;
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

