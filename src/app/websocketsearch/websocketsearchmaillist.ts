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

import { MessageDisplay } from '../common/messagedisplay';
import { WebSocketSearchMailRow } from '../websocketsearch/websocketsearchmailrow.class';
import { MessageTableRowTool} from '../messagetable/messagetablerow';
import { CanvasTableColumn } from '../canvastable/canvastablecolumn';
import { AppComponent } from '../app.component';

export class WebSocketSearchMailList extends MessageDisplay {

  // MessageDisplay implementations have different numbers of arguments..
  constructor(...args: any[]) {
    super(args[0]);
  }

  getRowSeen(index: number): boolean {
    const msg = (this.rows[index] as WebSocketSearchMailRow);
    return !msg.seen;
  }

  getRowId(index: number): number {
    const msg = (this.rows[index] as WebSocketSearchMailRow);
    return msg.id;
  }

  getRowMessageId(index: number): number {
    const msg = (this.rows[index] as WebSocketSearchMailRow);
    return msg.id;
  }


    public getCanvasTableColumns(_app: AppComponent): CanvasTableColumn[] {
        const columns: CanvasTableColumn[] = [
            {
                sortColumn: null,
                name: '',
                rowWrapModeHidden: true,
              getValue: (rowIndex: number): any => this.isSelectedRow(rowIndex),
                checkbox: true,
            },
            {
                name: 'Date',
                sortColumn: null,
                rowWrapModeMuted: true,
              getValue: (rowIndex: number): string => this.getRow(rowIndex).dateTime,
            },
            {
                name: 'From',
                sortColumn: null,
                getValue: (rowIndex: number): string => this.getRow(rowIndex).fromName,
            },
            {
                name: 'Subject',
                sortColumn: null,
                getValue: (rowIndex: number): string => this.getRow(rowIndex).subject,
                draggable: true
                // tooltipText: "Tip: Drag subject to a folder to move message(s)"
            },
            {
                sortColumn: null,
                name: 'Size',
                rowWrapModeHidden: true,
                textAlign: 1,
                getValue: (rowIndex: number): number => this.getRow(rowIndex).size,
                getFormattedValue: MessageTableRowTool.formatBytes,
            }
        ];

        return columns;
    }

}
