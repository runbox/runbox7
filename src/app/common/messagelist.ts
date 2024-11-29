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

import { MessageDisplay } from '../common/messagedisplay';
import { MessageInfo } from './messageinfo';
import { MessageTableRowTool} from '../messagetable/messagetablerow';
import { CanvasTableColumn } from '../canvastable/canvastablecolumn';

export class MessageList extends MessageDisplay {

  // MessageDisplay implementations have different numbers of arguments..
  constructor(...args: any[]) {
    super(args[0]);
  }

  getRowSeen(index: number): boolean {
    const msg: MessageInfo = this.rows[index];
    return !msg.seenFlag;
  }

  getRowId(index: number): number {
    const msg: MessageInfo = this.rows[index];
    return msg.id;
  }

  getRowMessageId(index: number): number {
    const msg: MessageInfo = this.rows[index];
    return msg.id;
  }


  // columns
  getFromColumnValueForRow(rowIndex: number): string {
    const rowobj = this.rows[rowIndex];
    return rowobj.from && rowobj.from.length > 0 ?
      rowobj.from[0].name ? rowobj.from[0].name :
      rowobj.from[0].address :
    '';
  }

  getToColumnValueForRow(rowIndex: number): string {
    const rowobj = this.rows[rowIndex];
    return rowobj.to && rowobj.to.length > 0 ?
      rowobj.to[0].name ? rowobj.to[0].name :
      rowobj.to[0].address :
    '';
  }

  // filter visible rows by whatever options the frontend has
  filterBy(options: Map<string, any>) {
    this.rows = this._rows;
    if (options.has('unreadOnly') && options.get('unreadOnly')) {
      this.rows = this._rows.filter((msg) => !msg.seenFlag);
    }
  }

  public getCanvasTableColumns(app: any): CanvasTableColumn[] {
    const columns: CanvasTableColumn[] = [
      {
        sortColumn: null,
        name: '',
        cacheKey: 'selectbox',
        rowWrapModeHidden: false,
        getValue: (rowIndex: number): any => this.isSelectedRow(rowIndex),
        checkbox: true,
        draggable: true
      },
      {
        name: 'Date',
        cacheKey: 'date',
        sortColumn: null,
        rowWrapModeMuted: true,
        getValue: (rowIndex: number): string => this.getRow(rowIndex).messageDate.toJSON(),
        getFormattedValue: (datestring) => MessageTableRowTool.formatTimestamp(datestring),
        draggable: true
      },
      {
        name: app.selectedFolder === 'Sent' ? 'To' : 'From',
        cacheKey: 'from',
        sortColumn: null,
        getValue: (rowIndex: number): any => app.selectedFolder === 'Sent'
          ? this.getToColumnValueForRow(rowIndex)
          : this.getFromColumnValueForRow(rowIndex),
        draggable: true
      },
      {
        name: 'Subject',
        cacheKey: 'subject',
        sortColumn: null,
        getValue: (rowIndex: number): string => this.getRow(rowIndex).subject,
        draggable: true,
        getContentPreviewText: (rowIndex): string => {
          const ret = this.getRow(rowIndex).plaintext;
          return ret ? ret.trim() : '';
        },
        // tooltipText: 'Tip: Drag subject to a folder to move message(s)'
      },
      {
        sortColumn: null,
        name: 'Size',
        cacheKey: 'size',
        rowWrapModeHidden: true,
        getValue: (rowIndex: number): number => this.getRow(rowIndex).size,
        getFormattedValue: MessageTableRowTool.formatBytes,
        draggable: true
      },
      {
        sortColumn: null,
        name: '',
        cacheKey: 'attachment',
        textAlign: 2,
        rowWrapModeHidden: true,
        font: '16px \'Material Icons\'',
        getValue: (rowIndex: number): boolean => this.getRow(rowIndex).attachment,
        getFormattedValue: (val) => val ? '\uE226' : '',
        tooltipText: 'Attachment'
      },
      {
        sortColumn: null,
        name: '',
        cacheKey: 'answered',
        textAlign: 2,
        rowWrapModeHidden: true,
        font: '16px \'Material Icons\'',
        getValue: (rowIndex: number): boolean => this.getRow(rowIndex).answeredFlag,
        getFormattedValue: (val) => val ? '\uE15E' : '',
        tooltipText: 'Answered'
      },
      {
        sortColumn: null,
        name: '',
        cacheKey: 'flagged',
        textAlign: 2,
        rowWrapModeHidden: true,
        font: '16px \'Material Icons\'',
        getValue: (rowIndex: number): boolean => this.getRow(rowIndex).flaggedFlag,
        getFormattedValue: (val) => val ? '\uE153' : '',
        tooltipText: 'Flagged'
      }
    ];

    return columns;
  }

  getRowData(rowIndex, app) {
    const row = this.rows[rowIndex]

    return {
      id: row.id,
      seen: row.seenFlag,
      messageDate: MessageTableRowTool.formatTimestamp(row.messageDate.toJSON()),
      from: app.selectedFolder === 'Sent'
        ? this.getToColumnValueForRow(rowIndex)
        : this.getFromColumnValueForRow(rowIndex),
      subject: row.subject,
      size: row.size,
      attachment: row.attachment ,
      answered: row.answeredFlag ,
      flagged: row.flaggedFlag ,
      plaintext: row.plaintext?.trim(),
    }; 
  }
}
