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
