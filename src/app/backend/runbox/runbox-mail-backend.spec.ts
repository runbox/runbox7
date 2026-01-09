// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2024 Runbox Solutions AS (runbox.com).
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

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { defer, of, throwError, timer } from 'rxjs';
import { finalize, map } from 'rxjs/operators';
import { RunboxMailBackend } from './runbox-mail-backend';
import { EmailContent } from '../mail-backend.interface';
import { RunboxWebmailAPI } from '../../rmmapi/rbwebmail';
import { FolderListEntry } from '../../common/folderlistentry';

describe('RunboxMailBackend', () => {
    let backend: RunboxMailBackend;
    let mockApi: jasmine.SpyObj<RunboxWebmailAPI>;

    beforeEach(() => {
        mockApi = jasmine.createSpyObj('RunboxWebmailAPI', [
            'getFolderList',
            'createFolder',
            'getMessageContents'
        ]);

        TestBed.configureTestingModule({
            providers: [
                RunboxMailBackend,
                { provide: RunboxWebmailAPI, useValue: mockApi }
            ]
        });

        backend = TestBed.inject(RunboxMailBackend);
    });

    describe('getEmailContents', () => {
        it('should return null for invalid IDs', (done) => {
            backend.getEmailContents(['abc', '', 'xyz']).subscribe(result => {
                expect(result.size).toBe(3);
                expect(result.get('abc')).toBeNull();
                expect(result.get('')).toBeNull();
                expect(result.get('xyz')).toBeNull();
                done();
            });
        });

        it('should reject partial numeric IDs like "123abc"', (done) => {
            backend.getEmailContents(['123abc', '456def']).subscribe(result => {
                expect(result.size).toBe(2);
                expect(result.get('123abc')).toBeNull();
                expect(result.get('456def')).toBeNull();
                // Should not have made any API calls
                expect(mockApi.getMessageContents).not.toHaveBeenCalled();
                done();
            });
        });

        it('should return null for IDs that fail to fetch', (done) => {
            mockApi.getMessageContents.and.returnValue(
                throwError(() => new Error('Network error'))
            );

            backend.getEmailContents(['123']).subscribe(result => {
                expect(result.size).toBe(1);
                expect(result.get('123')).toBeNull();
                done();
            });
        });

        it('should return content for valid IDs', (done) => {
            mockApi.getMessageContents.and.returnValue(of({
                text: { text: 'Hello', html: '<p>Hello</p>' }
            } as any));

            backend.getEmailContents(['123']).subscribe(result => {
                expect(result.size).toBe(1);
                const content = result.get('123');
                expect(content).not.toBeNull();
                expect(content?.textBody).toBe('Hello');
                expect(content?.htmlBody).toBe('<p>Hello</p>');
                done();
            });
        });

        it('should handle mixed valid and invalid IDs', (done) => {
            mockApi.getMessageContents.and.returnValue(of({
                text: { text: 'Test', html: '<p>Test</p>' }
            } as any));

            backend.getEmailContents(['123', 'invalid', '456']).subscribe(result => {
                expect(result.size).toBe(3);
                expect(result.get('123')).not.toBeNull();
                expect(result.get('invalid')).toBeNull();
                expect(result.get('456')).not.toBeNull();
                // Should only call API for valid IDs
                expect(mockApi.getMessageContents).toHaveBeenCalledTimes(2);
                done();
            });
        });

        it('should return empty map for empty input', (done) => {
            backend.getEmailContents([]).subscribe(result => {
                expect(result.size).toBe(0);
                expect(mockApi.getMessageContents).not.toHaveBeenCalled();
                done();
            });
        });

        it('should reject zero and negative IDs', (done) => {
            backend.getEmailContents(['0', '-1', '-123']).subscribe(result => {
                expect(result.size).toBe(3);
                expect(result.get('0')).toBeNull();
                expect(result.get('-1')).toBeNull();
                expect(result.get('-123')).toBeNull();
                expect(mockApi.getMessageContents).not.toHaveBeenCalled();
                done();
            });
        });

        it('should limit concurrent fetches', fakeAsync(() => {
            const ids = Array.from({ length: 12 }, (_value, index) => String(index + 1));
            let active = 0;
            let maxActive = 0;

            mockApi.getMessageContents.and.callFake(() =>
                defer(() => {
                    active += 1;
                    maxActive = Math.max(maxActive, active);

                    return timer(10).pipe(
                        map(() => ({
                            text: { text: 'Hello', html: '<p>Hello</p>' }
                        } as any)),
                        finalize(() => {
                            active -= 1;
                        })
                    );
                })
            );

            let result: Map<string, EmailContent | null> | undefined;
            backend.getEmailContents(ids).subscribe(res => {
                result = res;
            });

            tick(100);

            if (!result) {
                fail('Expected getEmailContents to emit a result map');
                return;
            }

            expect(result.size).toBe(12);
            expect(maxActive).toBe(5);
            expect(active).toBe(0);
        }));
    });

    describe('getChanges', () => {
        it('should throw a helpful error for unsupported backend', (done) => {
            backend.getChanges('state').subscribe({
                next: () => fail('Expected getChanges to error'),
                error: (err) => {
                    expect(err.message).toContain('getChanges is not supported');
                    expect(err.message).toContain('queryEmails');
                    done();
                }
            });
        });
    });

    describe('createMailbox', () => {
        it('should fail fast when parentId is provided but not found', (done) => {
            const folders = [
                new FolderListEntry(1, 0, 10, 'inbox', 'Inbox', 'Inbox', 0)
            ];
            mockApi.getFolderList.and.returnValue(of(folders));

            backend.createMailbox('NewFolder', '999').subscribe({
                next: () => fail('Should have errored'),
                error: (err) => {
                    expect(err.message).toBe('Parent mailbox not found: 999');
                    // Should not have called createFolder
                    expect(mockApi.createFolder).not.toHaveBeenCalled();
                    done();
                }
            });
        });

        it('should create mailbox under parent when parent exists', (done) => {
            const folders = [
                new FolderListEntry(1, 0, 10, 'inbox', 'Inbox', 'Inbox', 0),
                new FolderListEntry(2, 0, 5, 'user', 'Parent', 'Parent', 0)
            ];
            const foldersAfterCreate = [
                ...folders,
                new FolderListEntry(3, 0, 0, 'user', 'NewFolder', 'Parent.NewFolder', 1)
            ];

            mockApi.getFolderList.and.returnValues(of(folders), of(foldersAfterCreate));
            mockApi.createFolder.and.returnValue(of(true));

            backend.createMailbox('NewFolder', '2').subscribe({
                next: (mailbox) => {
                    expect(mailbox.name).toBe('NewFolder');
                    expect(mailbox.path).toBe('Parent.NewFolder');
                    expect(mockApi.createFolder).toHaveBeenCalledWith(2, 'NewFolder', []);
                    done();
                },
                error: (err) => fail(err)
            });
        });

        it('should select created mailbox by path when names are ambiguous', (done) => {
            const folders = [
                new FolderListEntry(1, 0, 10, 'inbox', 'Inbox', 'Inbox', 0),
                new FolderListEntry(2, 0, 5, 'user', 'Parent', 'Parent', 0),
                new FolderListEntry(3, 0, 5, 'user', 'Other', 'Other', 0),
                new FolderListEntry(10, 0, 0, 'user', 'NewFolder', 'Other.NewFolder', 1)
            ];
            const foldersAfterCreate = [
                ...folders,
                new FolderListEntry(11, 0, 0, 'user', 'NewFolder', 'Parent.NewFolder', 1)
            ];

            mockApi.getFolderList.and.returnValues(of(folders), of(foldersAfterCreate));
            mockApi.createFolder.and.returnValue(of(true));

            backend.createMailbox('NewFolder', '2').subscribe({
                next: (mailbox) => {
                    expect(mailbox.path).toBe('Parent.NewFolder');
                    expect(mailbox.id).toBe('11');
                    expect(mockApi.createFolder).toHaveBeenCalledWith(2, 'NewFolder', []);
                    done();
                },
                error: (err) => fail(err)
            });
        });

        it('should create top-level mailbox when no parentId', (done) => {
            const folders: FolderListEntry[] = [];
            const foldersAfterCreate = [
                new FolderListEntry(1, 0, 0, 'user', 'NewFolder', 'NewFolder', 0)
            ];

            mockApi.getFolderList.and.returnValues(of(folders), of(foldersAfterCreate));
            mockApi.createFolder.and.returnValue(of(true));

            backend.createMailbox('NewFolder').subscribe({
                next: (mailbox) => {
                    expect(mailbox.name).toBe('NewFolder');
                    expect(mailbox.path).toBe('NewFolder');
                    expect(mockApi.createFolder).toHaveBeenCalledWith(0, 'NewFolder', []);
                    done();
                },
                error: (err) => fail(err)
            });
        });

        it('should error when created mailbox is not found', (done) => {
            const folders: FolderListEntry[] = [];
            // Simulate the folder not appearing after creation
            mockApi.getFolderList.and.returnValues(of(folders), of(folders));
            mockApi.createFolder.and.returnValue(of(true));

            backend.createMailbox('NewFolder').subscribe({
                next: () => fail('Should have errored'),
                error: (err) => {
                    expect(err.message).toContain('Failed to find created mailbox');
                    done();
                }
            });
        });
    });
});
