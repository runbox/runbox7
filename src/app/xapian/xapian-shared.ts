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

export const XAPIAN_TERM_FOLDER = 'XFOLDER:';
export const XAPIAN_TERM_FLAGGED = 'XFflagged';
export const XAPIAN_TERM_SEEN = 'XFseen';
export const XAPIAN_TERM_ANSWERED = 'XFanswered';
export const XAPIAN_TERM_DELETED = 'XFdeleted';
export const XAPIAN_TERM_HASATTACHMENTS = 'XFattachment';

export const XAPIAN_GLASS_WR = 'xapianglasswr';

export interface SearchIndexDocumentData {
  id: string;
  from: string;
  subject: string;
  recipients: string[];
  textcontent: string;
  folder?: string;
  flagged?: boolean;
  seen?: boolean;
  answered?: boolean;
  deleted?: boolean;
  attachment?: boolean;
}

export const folderQuery = (folderName: string) => 'folder:"' + folderName.replace(/\//g, '\\.') + '" ';
