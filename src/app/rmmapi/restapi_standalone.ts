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
import { FolderStatsEntry } from '../common/folderstatsentry';
import { buildListAllMessagesUrl, LIST_ALL_MESSAGES_CHUNK_SIZE, parseListAllMessagesText } from './list-all-messages.util';
import { formatRestDatetime } from './rest-datetime';

export function listAllMessages(
  page: number,
  sinceid = 0,
  sincechangeddate = 0,
  pagesize: number = LIST_ALL_MESSAGES_CHUNK_SIZE,
  skipContent = false,
  folder?: string)
: Promise<MessageInfo[]> {
  const url = buildListAllMessagesUrl({
    page,
    sinceid,
    sincechangeddate,
    pagesize,
    skipContent,
    folder
  });

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
    .then(parseListAllMessagesText)
    .catch((error) => {
      console.error(error);
      return [];
    });

}

export function listDeletedMessagesSince(sincechangeddate: Date): Promise<number[]> {
        const datestring = formatRestDatetime(sincechangeddate);
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
