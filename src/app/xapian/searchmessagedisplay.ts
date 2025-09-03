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
import { SearchService } from './searchservice';
import { MessageTableRowTool} from '../messagetable/messagetablerow';

export class SearchMessageDisplay extends MessageDisplay {
  private searchService: SearchService;

  // MessageDisplay implementations have different numbers of arguments..
  constructor(...args: any[]) {
    super(args[1]);
    this.searchService = args[0];
  }

  getRowSeen(index: number): boolean {
    return this.searchService.getDocData(this.rows[index][0]).seen ? false : true;
  }

  getRowId(index: number): number {
    return this.rows[index][0];
  }

  getRowMessageId(index: number): number {
    let msgId = 0;
    try {
      msgId = this.searchService.getMessageIdFromDocId(this.getRowId(index));
    } catch (e) {
      // This shouldnt happen, it means something changed the stored
      // data without updating the messagedisplay rows.
      console.error('Tried to lookup ' + index + ' in searchIndex, isnt there! ', e);
    }
    return msgId;
  }

  filterBy(options: Map<string, any>) {
  }

  public getRowData(index: number, app: any) {
    const rowData: any = {
      id: this.getRowMessageId(index),
      messageDate: MessageTableRowTool.formatTimestampFromStringWithoutSeparators(this.searchService.api.getStringValue(this.getRowId(index), 2)),
      from: app.selectedFolder.indexOf('Sent') === 0 && !app.displayFolderColumn
        ? this.searchService.getDocData(this.getRowId(index)).recipients.join(', ')
        : this.searchService.getDocData(this.getRowId(index)).from,
      subject: this.searchService.getDocData(this.getRowId(index)).subject,
      plaintext: this.searchService.getDocData(this.getRowId(index)).textcontent?.trim(),
      size: this.searchService.api.getNumericValue(this.getRowId(index), 3),
      attachment: this.searchService.getDocData(this.getRowId(index)).attachment ? true : false,
      answered: this.searchService.getDocData(this.getRowId(index)).answered ? true : false,
      flagged: this.searchService.getDocData(this.getRowId(index)).flagged ? true : false,
      folder: this.searchService.getDocData(this.getRowId(index)).folder,
      seen: this.searchService.getDocData(this.getRowId(index)).seen,
    };

    if (app.viewmode === 'conversations') {
      const rowObj = this.getRow(index);

      const conversationId = this.searchService.api.getStringValue(rowObj[0], 1);
      this.searchService.api.setStringValueRange(1, 'conversation:');
      const conversationSearchText = `conversation:${conversationId}..${conversationId}`;
      const results = this.searchService.api.sortedXapianQuery(
        conversationSearchText,
        1, 0, 0, 1000, 1
      );
      this.searchService.api.clearValueRange();

      if (results[0]?.[1]) {
        rowObj[2] = `${results[0][1] + 1}`;
        rowData.count = rowObj[2];
      } else {
        rowData.count = 1
      }
    }

    return rowData;
  }
}
