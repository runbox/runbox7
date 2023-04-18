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

import { XapianAPI } from 'runbox-searchindex/rmmxapianapi';
import { MailAddressInfo } from './mailaddressinfo';

export class MessageInfo {
    deletedFlag: boolean;

    constructor(
        public id: number,
        public changedDate: Date,
        public messageDate: Date,
        public folder: string,
        public seenFlag: boolean,
        public answeredFlag: boolean,
        public flaggedFlag: boolean,
        public from: MailAddressInfo[],
        public to: MailAddressInfo[],
        public cc: MailAddressInfo[],
        public bcc: MailAddressInfo[],
        public subject: string,
        public plaintext: string,
        public size: number,
        public attachment: boolean) {
    }

    static getSubjectWithoutAbbreviation(subject: string) {
        const  emailsubjectabbreviations = [
            'RE:',
            'Re:',
            'FWD:',
            'Fwd:',
            'Fw:',
            'SV:',
            'VS:',
            'VB:'
        ];
        const subjectparts = subject ? subject.split(' ') : [];
        let subjectTextStart = 0;
        while (emailsubjectabbreviations.find(abbr => abbr === subjectparts[subjectTextStart])) {
            subjectTextStart ++;
        }
        return subjectparts.slice(subjectTextStart).join(' ');
    }
}

export class IndexingTools {

    constructor(private indexAPI: XapianAPI) {

    }

    public hashCode(str: string): number {
        let hash = 0;
        if (!str || str.length === 0) {
            return hash;
        }

        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            // eslint-disable-next-line no-bitwise
            hash = ((hash << 5) - hash) + char;
            // eslint-disable-next-line no-bitwise
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }

    public addMessageToIndex(msginfo: MessageInfo,
            foldersNotToIndex?: string[]
        ) {
        if (
            foldersNotToIndex && foldersNotToIndex.find(foldername =>
                msginfo.folder === foldername)
         ) {
            this.indexAPI.deleteDocumentByUniqueTerm('Q' + msginfo.id);
            console.log('Deleted msg id search index', msginfo.id);
            return;
        }

        let conversationId = msginfo.subject ? msginfo.subject.toUpperCase() : '0';

        // Remove email subject abbreviation (Re fwd etc)
        conversationId = MessageInfo.getSubjectWithoutAbbreviation(conversationId);
        let recipients = [];

        if (msginfo.to) {
            recipients = recipients.concat(msginfo.to.map((mailAddr) => mailAddr.nameAndAddress.substr(0, 200)));
        }
        if (msginfo.cc) {
            recipients = recipients.concat(msginfo.cc.map((mailAddr) => mailAddr.nameAndAddress.substr(0, 200)));
        }

        // Remove non alphanumeric characters so that it's possible to use Xapian range processor
        conversationId = conversationId.replace(/[^0-9A-Z]/g, '');

        // Add last word hash to conversation id
        const lastWordHash = msginfo.plaintext ? this.hashCode(msginfo.plaintext.split(/\s/)
            .reverse()
            .find((word) => word.replace(/[^a-z0-9]+/ig, '').trim().length >= 3)) : 0;
        conversationId += '' + (0x100000000 + lastWordHash).toString(16).substr(1).toUpperCase();

        const msgDateString = msginfo.messageDate.toJSON().substr(0, 'YYYY-MM-DD HH:mm'.length).replace(/[^0-9]/g, '');

        const fromAddressInfo = msginfo.from && msginfo.from[0] ? msginfo.from[0] : new MailAddressInfo('', '');
        const visibleFrom = fromAddressInfo.name ? fromAddressInfo.name : fromAddressInfo.address ? fromAddressInfo.address : '';

        // console.log(conversationId);
        this.indexAPI.addSortableEmailToXapianIndex(
            'Q' + msginfo.id,
            visibleFrom,
            visibleFrom.toUpperCase(),
            fromAddressInfo.address,
            recipients,
            msginfo.subject,
            conversationId,
            msgDateString,
            msginfo.size,
            msginfo.plaintext ? msginfo.plaintext : '',
            msginfo.folder,
            msginfo.seenFlag,
            msginfo.flaggedFlag,
            msginfo.answeredFlag,
            msginfo.attachment
        );
    }
}
