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

import { MessageInfo } from '../common/messageinfo';
import { MailAddressInfo } from '../common/mailaddressinfo';
import { FolderStatsEntry } from '../common/folderstatsentry';

const LIST_ALL_MESSAGES_CHUNK_SIZE = 10000;
export function listAllMessages(
  page: number,
  sinceid: number = 0,
  sincechangeddate: number = 0,
  pagesize: number = LIST_ALL_MESSAGES_CHUNK_SIZE,
  skipContent: boolean = false,
  folder?: string)
: Promise<MessageInfo[]> {
  // TODO: Need a JSON based REST api endpoint for this
  const url = '/mail/download_xapian_index?ngsw-bypass=1' +
    '&listallmessages=1' +
    '&page=' + page +
    '&sinceid=' + sinceid +
    '&sincechangeddate=' + Math.floor(sincechangeddate / 1000) +
    '&pagesize=' + pagesize + (skipContent ? '&skipcontent=1' : '') +
    (folder ? '&folder=' + folder : '') +
    '&avoidcacheuniqueparam=' + new Date().getTime();

  return fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'text/plain',
    },
  }).then((response) => {
    if (!response.ok) {
      throw new Error('Failed to fetch download_xapian_index?listallmessages ' + response.statusText);
    }
    return response.text();
  })
    .then((txt) => txt.length > 0 ? txt.split('\n') : [])
    .then((lines) => {
      const msgs = lines.map((line) => {
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
      return msgs;
    })
    .catch((error) => {
      console.error(error);
      return [];
    });

}

export function listDeletedMessagesSince(sincechangeddate: Date): Promise<number[]> {
        const datestring = sincechangeddate.toJSON().replace('T', ' ').substr(0, 'yyyy-MM-dd HH:mm:ss'.length);
        const url = `/rest/v1/list/deleted_messages/${datestring}`;

  return fetch(
    url,
    { method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  ).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to fetch /rest/v1/list/deleted_messages/${datestring} ` + response.statusText);
    }
    return response.json();
  })
    .then((r) => {
      return r.message_ids as number[];
    })
    .catch((error) => {
      console.error(error);
      return [];
    });
}

export function folderStats(folderName: string): Promise<void | FolderStatsEntry> {
  const url = `/rest/v1/email_folder/stats/${folderName}`;

  return fetch (
    url,
    { method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  ).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to fetch /rest/v1/email_folder/stats/${folderName} ` + response.statusText);
    }
    return response.json();
  })
    .then((res) => {
        const fse = new FolderStatsEntry();
        fse.total = res.result.stats.total;
        fse.total_unseen = res.result.stats.total_unseen;
        fse.total_seen = res.result.stats.total_seen;
        return fse;
    })
    .catch(
      (error) => console.error(error)
    );
}


export function updateFolderCounts(folderName: string): Promise<any> {
  return fetch (
    `/rest/v1/email_folder/stats/${folderName}`,
    { method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  ).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to POST to /rest/v1/email_folder/stats/${folderName}` + response.statusText);
    }
    return response.json();
  })
    .catch(
      (error) => console.error(error)
    );

}
