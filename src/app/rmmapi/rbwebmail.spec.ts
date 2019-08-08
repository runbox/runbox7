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

import { TestBed } from '@angular/core/testing';
import { RunboxWebmailAPI } from './rbwebmail';
import { MatSnackBarModule, MatDialogModule } from '@angular/material';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

describe('RBWebMail', () => {
    beforeEach(() => {
            TestBed.configureTestingModule({
                imports: [
                    MatSnackBarModule,
                    MatDialogModule,
                    HttpClientTestingModule,
                ],
                providers: [RunboxWebmailAPI]
            });
    });

    it('should cache message contents', async () => {
        const rmmapi = TestBed.get(RunboxWebmailAPI);

        let messageContentsObservable = rmmapi.getMessageContents(123);

        const httpTestingController = TestBed.get(HttpTestingController);
        let req = httpTestingController.expectOne('/rest/v1/email/123');
        req.flush({
            result: {
                id: 123,
                subject: 'test'
            }
        });

        let messageContents = await messageContentsObservable.toPromise();
        expect(messageContents.id).toBe(123);
        expect(messageContents.subject).toBe('test');

        messageContentsObservable = rmmapi.getMessageContents(123);
        httpTestingController.expectNone('/rest/v1/email/123');

        messageContents = await messageContentsObservable.toPromise();
        expect(messageContents.id).toBe(123);
        expect(messageContents.subject).toBe('test');

        messageContentsObservable = rmmapi.getMessageContents(123, true);
        req = httpTestingController.expectOne('/rest/v1/email/123');
        req.flush({
            result: {
                id: 123,
                subject: 'test2'
            }
        });

        messageContents = await messageContentsObservable.toPromise();
        expect(messageContents.id).toBe(123);
        expect(messageContents.subject).toBe('test2');

        rmmapi.deleteCachedMessageContents(123);

        messageContentsObservable = rmmapi.getMessageContents(123);
        req = httpTestingController.expectOne('/rest/v1/email/123');
        req.flush({
            result: {
                id: 123,
                subject: 'test3'
            }
        });

        messageContents = await messageContentsObservable.toPromise();
        expect(messageContents.id).toBe(123);
        expect(messageContents.subject).toBe('test3');
    });
});
