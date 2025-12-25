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

import { MessageInfo } from '../common/messageinfo';
import { MailAddressInfo } from '../common/mailaddressinfo';

export const LIST_ALL_MESSAGES_CHUNK_SIZE = 10000;

export interface ListAllMessagesParams {
  page: number;
  sinceid?: number;
  sincechangeddate?: number;
  pagesize?: number;
  skipContent?: boolean;
  folder?: string;
}

export function buildListAllMessagesUrl(params: ListAllMessagesParams): string {
  const {
    page,
    sinceid = 0,
    sincechangeddate = 0,
    pagesize = LIST_ALL_MESSAGES_CHUNK_SIZE,
    skipContent = false,
    folder,
  } = params;

  return '/mail/download_xapian_index?ngsw-bypass=1' +
    '&listallmessages=1' +
    '&page=' + page +
    '&sinceid=' + sinceid +
    '&sincechangeddate=' + Math.floor(sincechangeddate / 1000) +
    '&pagesize=' + pagesize + (skipContent ? '&skipcontent=1' : '') +
    (folder ? '&folder=' + folder : '') +
    '&avoidcacheuniqueparam=' + new Date().getTime();
}

export function parseListAllMessagesLines(lines: string[]): MessageInfo[] {
  return lines.map((line) => {
    const parts = line.split('\t');
    const from_ = parts[7];
    const to = parts[8];
    const fromInfo: MailAddressInfo[] = MailAddressInfo.parse(from_);
    const toInfo: MailAddressInfo[] = MailAddressInfo.parse(to);
    const size: number = parseInt(parts[10], 10);
    const attachment: boolean = parts[11] === 'y';
    const seenFlag: boolean = parseInt(parts[4], 10) === 1;
    const answeredFlag: boolean = parseInt(parts[5], 10) === 1;
    const flaggedFlag: boolean = parseInt(parts[6], 10) === 1;

    const ret = new MessageInfo(
      parseInt(parts[0], 10), // id
      new Date(parseInt(parts[1], 10) * 1000), // changed date
      new Date(parseInt(parts[2], 10) * 1000), // message date
      parts[3],                                // folder
      seenFlag,                                // seen flag
      answeredFlag,                            // answered flag
      flaggedFlag,                             // flagged flag
      fromInfo,                                // from
      toInfo,                                  // to
      [],                                      // cc
      [],                                      // bcc
      parts[9],                                // subject
      parts[12],                               // plaintext body
      size,                                    // size
      attachment                               // attachment
    );
    if (size === -1) {
      // Size = -1 means deleted flag is set - ref hack in Webmail.pm
      ret.deletedFlag = true;
    }
    return ret;
  });
}

export function parseListAllMessagesText(txt: string): MessageInfo[] {
  const lines = txt.length > 0 ? txt.split('\n') : [];
  return parseListAllMessagesLines(lines);
}
