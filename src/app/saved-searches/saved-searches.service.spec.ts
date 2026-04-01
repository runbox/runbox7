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

import { SavedSearchesService, SavedSearchStorage } from './saved-searches.service';
import { of, Observable, firstValueFrom } from 'rxjs';

class MockStorageService {
    private store = new Map<string, any>();
    me: Observable<any> = of({ uid: 42 });

    get(key: string): Promise<any> {
        return Promise.resolve(this.store.get(key));
    }

    set(key: string, value: any): Promise<void> {
        this.store.set(key, value);
        return Promise.resolve();
    }
}

class MockRunboxWebmailAPI {
    private savedSearchesData: SavedSearchStorage = {
        version: 0,
        entries: []
    };

    getSavedSearches(): Observable<SavedSearchStorage> {
        return of(this.savedSearchesData);
    }

    setSavedSearches(data: SavedSearchStorage): Observable<SavedSearchStorage> {
        this.savedSearchesData = data;
        return of(this.savedSearchesData);
    }
}

describe('SavedSearchesService', () => {
    let service: SavedSearchesService;
    let mockStorage: MockStorageService;
    let mockRmmapi: MockRunboxWebmailAPI;

    beforeEach(() => {
        mockStorage = new MockStorageService();
        mockRmmapi = new MockRunboxWebmailAPI();
        service = new SavedSearchesService(mockStorage as any, mockRmmapi as any);
    });

    describe('Saved search management', () => {
        it('should add a new search', (done) => {
            setTimeout(() => {
                service.add({ name: 'Test Search', query: 'test query' });

                setTimeout(() => {
                    firstValueFrom(service.searches).then(searches => {
                        expect(searches.length).toBe(1);
                        expect(searches[0].name).toBe('Test Search');
                        expect(searches[0].query).toBe('test query');
                        done();
                    });
                }, 30);
            }, 10);
        });

        it('should remove a search', (done) => {
            setTimeout(() => {
                service.add({ name: 'Search 1', query: 'query1' });
                service.add({ name: 'Search 2', query: 'query2' });

                setTimeout(() => {
                    service.remove(0);

                    setTimeout(() => {
                        firstValueFrom(service.searches).then(searches => {
                            expect(searches.length).toBe(1);
                            expect(searches[0].name).toBe('Search 2');
                            done();
                        });
                    }, 30);
                }, 20);
            }, 10);
        });

        it('should return searches consistently', (done) => {
            setTimeout(() => {
                service.add({ name: 'Test', query: 'test' });

                setTimeout(() => {
                    Promise.all([
                        firstValueFrom(service.searches),
                        firstValueFrom(service.searches)
                    ]).then(([s1, s2]) => {
                        expect(s1).toBe(s2);
                        done();
                    });
                }, 30);
            }, 10);
        });
    });

    describe('Storage persistence', () => {
        it('should save searches to storage', (done) => {
            setTimeout(() => {
                service.add({ name: 'Storage Test', query: 'storage test' });

                setTimeout(() => {
                    mockStorage.get('saved-searches').then((data: SavedSearchStorage) => {
                        expect(data).toBeDefined();
                        expect(data.entries.length).toBe(1);
                        expect(data.entries[0].name).toBe('Storage Test');
                        done();
                    });
                }, 50);
            }, 10);
        });

        it('should load searches from storage on initialization', async () => {
            const preloadedStorage = new MockStorageService();
            await preloadedStorage.set('saved-searches', {
                version: 1,
                entries: [
                    { name: 'Preloaded Search', query: 'preloaded' }
                ]
            });

            const testService = new SavedSearchesService(preloadedStorage as any, mockRmmapi as any);

            await new Promise(resolve => setTimeout(resolve, 30));

            const searches = await firstValueFrom(testService.searches);
            expect(searches.length).toBe(1);
            expect(searches[0].name).toBe('Preloaded Search');
            expect(testService.version).toBe(1);
        });

        it('should handle empty saved-searches in storage', async () => {
            const emptyStorage = new MockStorageService();
            await emptyStorage.set('saved-searches', null);

            const testService = new SavedSearchesService(emptyStorage as any, mockRmmapi as any);

            await new Promise(resolve => setTimeout(resolve, 30));

            const searches = await firstValueFrom(testService.searches);
            expect(searches).toEqual([]);
        });
    });

    describe('Versioning and sync', () => {
        it('should increment version when searches are modified', (done) => {
            setTimeout(() => {
                const initialVersion = service.version;

                service.add({ name: 'Version Test', query: 'version test' });

                setTimeout(() => {
                    expect(service.version).toBeGreaterThan(initialVersion);
                    done();
                }, 30);
            }, 10);
        });

        it('should sync with server when server version is higher', (done) => {
            setTimeout(() => {
                service.add({ name: 'Local Search', query: 'local' });

                setTimeout(() => {
                    const localVersion = service.version;

                    const highVersionStorage = new MockStorageService();
                    const highVersionRmmapi = new MockRunboxWebmailAPI();

                    highVersionRmmapi.getSavedSearches = () => of({
                        version: localVersion + 10,
                        entries: [
                            { name: 'Server Search', query: 'server' }
                        ]
                    } as any);

                    const testService = new SavedSearchesService(
                        highVersionStorage as any,
                        highVersionRmmapi as any
                    );

                    setTimeout(() => {
                        expect(testService.version).toBeGreaterThan(localVersion);
                        done();
                    }, 50);
                }, 30);
            }, 10);
        });
    });

    describe('Edge cases', () => {
        it('should handle removing from empty searches list', (done) => {
            setTimeout(() => {
                service.remove(0);

                setTimeout(() => {
                    firstValueFrom(service.searches).then(searches => {
                        expect(searches).toEqual([]);
                        done();
                    });
                }, 20);
            }, 10);
        });

        it('should handle removing from out of bounds index', (done) => {
            setTimeout(() => {
                service.add({ name: 'Only Search', query: 'only' });

                setTimeout(() => {
                    service.remove(10);

                    setTimeout(() => {
                        firstValueFrom(service.searches).then(searches => {
                            expect(searches.length).toBe(1);
                            done();
                        });
                    }, 20);
                }, 20);
            }, 10);
        });
    });
});
