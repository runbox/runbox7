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

declare var Module;

const emAllocateString = function (str) {
  if (!str) {
    str = '';
  }

  const $str = Module._malloc(str.length * 4 + 1);
  Module.stringToUTF8(str, $str, str.length * 4 + 1);
  return $str;
};

export class XapianAPI {

  public initXapianIndex: (path: string) => void = Module.cwrap('initXapianIndex', null, ['string']);
  public initXapianIndexReadOnly: (path: string) => void = Module.cwrap('initXapianIndexReadOnly', null, ['string']);
  public addSingleFileXapianIndex: (path: string) => void = Module.cwrap('addSingleFileXapianIndex', null, ['string']);
  public addFolderXapianIndex: (path: string) => void = Module.cwrap('addFolderXapianIndex', null, ['string']);
  public compactDatabase: () => void = Module.cwrap('compactDatabase', null, []);
  public compactToWritableDatabase: (path: string) => void = Module.cwrap('compactToWritableDatabase', null, ['string']);
  public addToXapianIndex: (id: string, val: string) => void = Module.cwrap('addToXapianIndex', null, ['string', 'string']);
  public commitXapianUpdates: () => void = Module.cwrap('commitXapianUpdates', null, []);
  public getXapianDocCount: () => number = Module.cwrap('getDocCount', 'number', []);
  public getLastDocid: () => number = Module.cwrap('getLastDocid', 'number', []);
  public reloadXapianDatabase: () => void = Module.cwrap('reloadDatabase', null, []);
  public closeXapianDatabase: () => void = Module.cwrap('closeDatabase', null, []);
  public setStringValueRange: (valuenumber: number, prefix: string) =>
    void = Module.cwrap('setStringValueRange', null, ['number', 'string']);
  public clearValueRange: () => void = Module.cwrap('clearValueRange', null, []);
  public getNumericValue: (docid: number, slot: number) => number = Module.cwrap('getNumericValue', 'number', ['number', 'number']);
  public termlist: (prefix: string) => number = Module.cwrap('termlist', 'number', ['string']);
  public documentTermList: (docid: number) => number = Module.cwrap('documentTermList', 'number', ['number']);
  public documentXTermList: (docid: number) => number = Module.cwrap('documentXTermList', 'number', ['number']);
  public deleteDocumentByUniqueTerm: (id: string) => void = Module.cwrap('deleteDocumentByUniqueTerm', null, ['string']);
  public deleteDocumentFromAddedWritablesByUniqueTerm: (id: string) => number =
    Module.cwrap('deleteDocumentFromAddedWritablesByUniqueTerm', 'number', ['string']);
  public setStringValue: (docid: number, slot: number, val: string) => void =
    Module.cwrap('setStringValue', null, ['number', 'number', 'string']);
  public changeDocumentsFolder: (unique_term: string, folder: string) =>
    void = Module.cwrap('changeDocumentsFolder', null, ['string', 'string']);
  public addTermToDocument: (idterm: string, termname: string) => void = Module.cwrap('addTermToDocument', null, ['string', 'string']);
  public removeTermFromDocument: (idterm: string, termname: string) => void =
        Module.cwrap('removeTermFromDocument', null, ['string', 'string']);
  public addTextToDocument: (idterm: string, withoutpositions: boolean, text: string) => void =
        Module.cwrap('addTextToDocument', null, ['string', 'boolean', 'string']);
  public getDocIdFromUniqueIdTerm: (idterm: string) => number =
        Module.cwrap('getDocIdFromUniqueIdTerm', 'number', ['string']);

  public getStringValue(docid, slot): string {
    const $ret = Module._malloc(1024);
    Module._getStringValue(docid, slot, $ret);
    const ret = Module.UTF8ToString($ret);
    Module._free($ret);
    return ret;
  }

  public listFolders(): any[] {
    const $ret = Module._malloc(8192);
    Module._listFolders($ret);
    const cret = Module.UTF8ToString($ret);
    Module._free($ret);
    const ret: any[] = cret.split(',');
    ret.forEach((r: string, ndx: number) => {
      ret[ndx] = r.split(':');
      ret[ndx][1] = parseInt(ret[ndx][1], 10);
    });
    return ret;
  }

  public listUnreadFolders(): any[] {
    const $ret = Module._malloc(8192);
    const folderCount: number = Module._listUnreadFolders($ret);
    if (folderCount > 0) {
      const cret = Module.UTF8ToString($ret);
      Module._free($ret);
      const ret: any[] = cret.split(',');
      ret.forEach((r: string, ndx: number) => {
        ret[ndx] = r.split(':');
        ret[ndx][1] = parseInt(ret[ndx][1], 10);
      });
      return ret;
    } else {
      return [];
    }
  }

  public queryXapianIndex(querystring, offset, maxresults): Array<string> {
    const $searchResults = Module._malloc(4 * maxresults);
    Module.HEAP8.set(new Uint8Array(maxresults * 4), $searchResults);

    const $queryString = emAllocateString(querystring);
    const $resultIdTerm = Module._malloc(128);

    const hits = Module._queryIndex($queryString, $searchResults, offset, maxresults);
    // console.log(hits);
    const results = new Array(hits);
    for (let n = 0; n < hits; n++) {
      const docid = Module.getValue($searchResults + (n * 4), 'i32');
      Module._getDocumentData(docid, $resultIdTerm);
      results[n] = Module.UTF8ToString($resultIdTerm);
    }
    Module._free($searchResults);
    Module._free($queryString);
    Module._free($resultIdTerm);
    return results;

  }

  public sortedXapianQuery(querystring: string,
    sortcol: number,
    reverse: number,
    offset: number,
    maxresults: number,
    collapsecol: number): Array<any> {
    const $searchResults = Module._malloc(4 * maxresults);
    const $collapseCount = Module._malloc(4 * maxresults);

    Module.HEAP8.set(new Uint8Array(maxresults * 4), $searchResults);
    Module.HEAP8.set(new Uint8Array(maxresults * 4), $collapseCount);

    const $queryString = emAllocateString(querystring);

    const hits = Module._sortedXapianQuery($queryString, sortcol, reverse, $searchResults, offset, maxresults, collapsecol, $collapseCount);
    // console.log("Sorted xapian query returned "+hits);

    const results = new Array(hits);
    for (let n = 0; n < hits; n++) {
      results[n] = [
        Module.getValue($searchResults + (n * 4), 'i32'),
        Module.getValue($collapseCount + (n * 4), 'i32')
      ];

    }
    Module._free($collapseCount);
    Module._free($searchResults);
    Module._free($queryString);
    return results;
  }

  public getDocumentData(docid) {
    const $docdata = Module._malloc(1024);
    Module._getDocumentData(docid, $docdata);
    const ret = Module.UTF8ToString($docdata);
    Module._free($docdata);
    return ret;
  }

  public addSortableEmailToXapianIndex(
    idTerm,  // Message id
    sender, // from (name or email address if no name is present)
    sortableFrom, // e.g. uppercase of the field above
    fromEmailAddress,
    recipients, // Array of strings with recipient email addresses
    subject,
    sortableSubject, // Uppercase of subject
    dateString, // Datestring (YYYYMMDDHHmm)
    messageSize, // mail message size in bytes
    text, // mail text content (may also add attachment text here)
    folder: string,
    seen: boolean, // seen_flag (0 if unread, 1 if read)
    flagged: boolean, // seen_flag (0 if unread, 1 if read)
    answered: boolean, // seen_flag (0 if unread, 1 if read)
    attachment: boolean // (0 if no attachments, 1 if message has attachments)
  ) {
    let $pointerPtr = 0;

    let pointers;
    if (recipients) {
      pointers = new Uint32Array(recipients.length);
      for (let n = 0; n < recipients.length; n++) {
        const recp = recipients[n];

        const $recp = Module._malloc(recp.length * 4 + 1);
        Module.stringToUTF8(recp, $recp, recp.length * 4 + 1);
        pointers[n] = $recp;
      }

      // Allocate bytes needed for the array of pointers
      const nPointerBytes = pointers.length * pointers.BYTES_PER_ELEMENT;
      $pointerPtr = Module._malloc(nPointerBytes);

      // Copy array of pointers to Emscripten heap
      const pointerHeap = new Uint8Array(Module.HEAPU8.buffer, $pointerPtr, nPointerBytes);
      pointerHeap.set(new Uint8Array(pointers.buffer));

    }


    const $idTerm = emAllocateString(idTerm);
    const $sender = emAllocateString(sender);
    const $sortableFrom = emAllocateString(sortableFrom);
    const $fromEmailAddress = emAllocateString(fromEmailAddress);
    const $subject = emAllocateString(subject);
    const $sortableSubject = emAllocateString(sortableSubject);
    const $dateString = emAllocateString(dateString);
    const $text = emAllocateString(text);
    const $folder = emAllocateString(folder);

    Module._addSortableEmailToXapianIndex(
      $idTerm,
      $sender,
      $sortableFrom,
      $fromEmailAddress,
      recipients ? recipients.length : 0,
      $pointerPtr,
      $subject,
      $sortableSubject,
      $dateString,
      messageSize,
      $text,
      $folder,
      (seen ? 1 : 0) +
      (flagged ? 2 : 0) +
      (answered ? 4 : 0) +
      (attachment ? 8 : 0)
    );
    Module._free($folder);
    Module._free($text);
    Module._free($dateString);
    Module._free($sortableSubject);
    Module._free($subject);
    Module._free($fromEmailAddress);
    Module._free($sortableFrom);
    Module._free($sender);
    Module._free($idTerm);

    if (pointers) {
      Module._free($pointerPtr);

      for (let n = pointers.length - 1; n >= 0; n--) {
        Module._free(pointers[n]);
      }
    }
  }

  hasMessageId(id: number): boolean {
    window['termlistresult'] = [];
    this.termlist('Q' + id);
    return window['termlistresult'].findIndex(t => t === '') > -1;
  }
}

export class SearchParams {
  constructor(
    public querystring: string,
    public sortcol: number,
    public reverse: number,
    public offset: number,
    public maxresults: number,
    public collapsecol: number
  ) {

  }
}
