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

import { WebSocketSearchService } from './websocketsearch.service';
import { firstValueFrom, of } from 'rxjs';

class MockSnackBar {
    open(_message: string, _action: string) {
        return {
            afterDismissed: () => of({})
        } as any;
    }
}

class MockWebSocket {
    onopen: any;
    onclose: any;
    onerror: any;
    onmessage: any;
    private ready = false;

    constructor(public url: string) {}

    send(_data: string): void {
        if (!this.ready) {
            throw new Error('WebSocket not ready');
        }
    }

    close(): void {
        this.ready = false;
        if (this.onclose) {
            this.onclose();
        }
    }

    simulateOpen(): void {
        this.ready = true;
        if (this.onopen) {
            this.onopen();
        }
    }

    simulateMessage(data: any): void {
        if (this.onmessage) {
            this.onmessage({ data: JSON.stringify(data) });
        }
    }

    simulateError(error: any): void {
        if (this.onerror) {
            this.onerror(error);
        }
    }
}

describe('WebSocketSearchService', () => {
    let service: WebSocketSearchService;
    let mockWebSocket: MockWebSocket;
    let mockSnackBar: MockSnackBar;

    // Save original WebSocket
    const OriginalWebSocket = (window as any).WebSocket;

    beforeEach(() => {
        mockSnackBar = new MockSnackBar();
        service = new WebSocketSearchService(mockSnackBar as any);

        // Mock WebSocket constructor
        mockWebSocket = new MockWebSocket('ws://localhost/websocket');
        (window as any).WebSocket = jasmine.createSpy('WebSocket').and.returnValue(mockWebSocket);
    });

    afterEach(() => {
        // Restore original WebSocket
        (window as any).WebSocket = OriginalWebSocket;
        if (service && service['websocket']) {
            service.close();
        }
    });

    describe('WebSocket connection', () => {
        it('should connect to WebSocket server', () => {
            service.open();
            expect((window as any).WebSocket).toHaveBeenCalled();
        });

        it('should be ready after receiving Ready message', (done) => {
            service.open();
            mockWebSocket.simulateOpen();
            mockWebSocket.simulateMessage(['Ready']);

            setTimeout(() => {
                firstValueFrom(service.searchReadySubject).then(value => {
                    expect(value).toBe(true);
                    done();
                });
            }, 10);
        });

        it('should create new searchReadySubject on close', (done) => {
            service.open();
            mockWebSocket.simulateOpen();
            mockWebSocket.simulateMessage(['Ready']);

            const originalSubject = service.searchReadySubject;

            setTimeout(() => {
                service.close();

                expect(service.searchReadySubject).not.toBe(originalSubject);
                done();
            }, 10);
        });
    });

    describe('Search functionality', () => {
        it('should emit search results when received', (done) => {
            const results: any[] = [];
            service.searchresults.subscribe(r => results.push(r));

            service.open();
            mockWebSocket.simulateOpen();

            mockWebSocket.simulateMessage([
                [
                    'M123', '2024-01-01 12:00:00', 'Test Sender', 'Test Subject',
                    'test@example.com', 1000, 1
                ]
            ]);

            setTimeout(() => {
                expect(results.length).toBeGreaterThan(0);
                const lastResult = results[results.length - 1];
                expect(lastResult).toBeDefined();
                expect(lastResult.length).toBe(1);
                expect(lastResult[0].id).toBe(123);
                expect(lastResult[0].subject).toBe('Test Subject');
                done();
            }, 10);
        });

        it('should emit empty array when no results found', (done) => {
            const results: any[] = [];
            service.searchresults.subscribe(r => results.push(r));

            service.open();
            mockWebSocket.simulateOpen();
            mockWebSocket.simulateMessage([]);

            setTimeout(() => {
                expect(results.length).toBeGreaterThan(0);
                const lastResult = results[results.length - 1];
                expect(lastResult).toEqual([]);
                done();
            }, 10);
        });

        it('should emit null for empty search query', (done) => {
            const results: any[] = [];
            service.searchresults.subscribe(r => results.push(r));

            service.open();
            mockWebSocket.simulateOpen();
            mockWebSocket.simulateMessage(['Ready']);

            setTimeout(() => {
                service.search('');

                setTimeout(() => {
                    expect(results[results.length - 1]).toBe(null);
                    done();
                }, 10);
            }, 10);
        });
    });

    describe('Search state management', () => {
        it('should set searchInProgress to true when searching', (done) => {
            service.open();
            mockWebSocket.simulateOpen();
            mockWebSocket.simulateMessage(['Ready']);

            setTimeout(() => {
                service.search('test');

                expect(service.searchInProgress).toBe(true);
                done();
            }, 10);
        });

        it('should set searchInProgress to false after results received', (done) => {
            service.open();
            mockWebSocket.simulateOpen();
            mockWebSocket.simulateMessage(['Ready']);

            setTimeout(() => {
                service.search('test');

                setTimeout(() => {
                    mockWebSocket.simulateMessage([
                        ['M1', '2024-01-01 12:00:00', 'Sender', 'Subject', 'test@example.com', 1000, 1]
                    ]);
                }, 5);

                setTimeout(() => {
                    expect(service.searchInProgress).toBe(false);
                    done();
                }, 50);
            }, 10);
        });

        it('should store last requested search text', (done) => {
            service.open();
            mockWebSocket.simulateOpen();
            mockWebSocket.simulateMessage(['Ready']);

            setTimeout(() => {
                service.search('  test query  ');

                expect(service.lastRequestedSearchText).toBe('test query');
                done();
            }, 10);
        });

        it('should not start new search if one is in progress', (done) => {
            service.open();
            mockWebSocket.simulateOpen();
            mockWebSocket.simulateMessage(['Ready']);

            setTimeout(() => {
                service.search('first');
                expect(service.searchInProgress).toBe(true);

                // The lastRequestedSearchText is updated before the in-progress check
                // so it will be 'second' - this is intentional behavior so the service
                // knows to run the latest search when the current one completes
                service.search('second');

                expect(service.lastRequestedSearchText).toBe('second');
                expect(service.searchInProgress).toBe(true); // Still processing first search
                done();
            }, 10);
        });
    });

    describe('Error handling', () => {
        it('should handle WebSocket errors', (done) => {
            service.open();
            mockWebSocket.simulateOpen();

            service.search('test');
            expect(service.searchInProgress).toBe(true);

            mockWebSocket.simulateError(new Error('WebSocket error'));

            setTimeout(() => {
                expect(service.searchInProgress).toBe(false);
                done();
            }, 10);
        });

        it('should handle error messages from server', (done) => {
            const snackOpenSpy = spyOn(mockSnackBar, 'open').and.callThrough();

            service.open();
            mockWebSocket.simulateOpen();

            mockWebSocket.simulateMessage({ error: 'Search failed' });

            setTimeout(() => {
                expect(snackOpenSpy).toHaveBeenCalledWith('Search failed', 'Dismiss');
                done();
            }, 10);
        });

        it('should set searchInProgress to false on WebSocket close', (done) => {
            service.open();
            mockWebSocket.simulateOpen();

            service.search('test');
            expect(service.searchInProgress).toBe(true);

            mockWebSocket.close();

            setTimeout(() => {
                expect(service.searchInProgress).toBe(false);
                done();
            }, 10);
        });
    });
});
