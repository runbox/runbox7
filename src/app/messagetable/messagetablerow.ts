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

const datelen: number = 'yyyy-MM-dd'.length;

export class MessageTableRowTool {

    public static formatTimestampFromDate(mailTime: Date): string {
        // Adjust for users timezone
        mailTime.setMinutes(mailTime.getMinutes() - mailTime.getTimezoneOffset());

        const timezoneadjustedJSONDateString = mailTime.toJSON();

        const currentDateString: string = new Date().toJSON().substr(0, datelen);
        if (timezoneadjustedJSONDateString.substr(0, datelen) === currentDateString) {
            return timezoneadjustedJSONDateString.substr(datelen + 1, 5);
        } else {
            return timezoneadjustedJSONDateString.substr(0, datelen);
        }
    }

    /**
     *
     * @param dateString (yyyyMMddHHmm)
     */
    public static formatTimestampFromStringWithoutSeparators(dateString): string {
        const datearr = dateString.match(/([0-9][0-9][0-9][0-9])([0-9][0-9])([0-9][0-9])([0-9][0-9])([0-9][0-9])/);

        if (datearr) {
            // Adjust for users timezone
            return MessageTableRowTool.formatTimestampFromDate(
                new Date(Date.UTC(
                    parseInt(datearr[1], 10),
                    parseInt(datearr[2], 10) - 1,
                    parseInt(datearr[3], 10),
                    parseInt(datearr[4], 10),
                    parseInt(datearr[5], 10),
                    0
                )
            ));
        } else {
            return '';
        }
    }

    public static formatTimestamp(jsonDateString): string {
        const datearr = jsonDateString.match(/([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])T([0-9][0-9]):([0-9][0-9]):([0-9][0-9])/);

        // Adjust for users timezone
        return MessageTableRowTool.formatTimestampFromDate(
            new Date(Date.UTC(
                parseInt(datearr[1], 10),
                parseInt(datearr[2], 10) - 1,
                parseInt(datearr[3], 10),
                parseInt(datearr[4], 10),
                parseInt(datearr[5], 10),
                parseInt(datearr[6], 10)
            )
        ));
    }

    public static formatBytes(a, b?): string {
        if (0 === a) {
            return'0 B';
        }

        const c = 1e3,
            d = b || 0,
            e = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
            f = Math.floor(Math.log(a) / Math.log(c));

        return parseFloat((a / Math.pow(c, f)).toFixed(d)) + ' ' + e[f];
    }
}

export interface MessageTableRow {
    jsonDateString: string;
    from: string;
    subject: string;
    conversationCount: number;
    messageSize: number;
}
