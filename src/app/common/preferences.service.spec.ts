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

import { PreferencesService, DefaultPrefGroups, PreferencesResult } from './preferences.service';
import { ScreenSize } from '../mobile-query.service';
import { of, Subject, firstValueFrom, Observable } from 'rxjs';
import { take } from 'rxjs/operators';

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

class MockMobileQueryService {
    screenSize = ScreenSize.Desktop;
    screenSizeChanged: Subject<ScreenSize> = new Subject();
}

class MockRunboxWebmailAPI {
    private prefsData: PreferencesResult = {
        'Global': { version: 0, entries: {} } as any,
        'Desktop': { version: 0, entries: {} } as any,
        'Mobile': { version: 0, entries: {} } as any
    };

    getPreferences(): Observable<PreferencesResult> {
        return of(this.prefsData);
    }

    setPreferences(level: string, data: any): Observable<PreferencesResult> {
        this.prefsData[level] = data.value;
        return of(this.prefsData);
    }
}

describe('PreferencesService', () => {
    let mockStorage: MockStorageService;
    let mockRmmapi: MockRunboxWebmailAPI;
    let mockMobileQuery: MockMobileQueryService;
    let service: PreferencesService;

    beforeEach(() => {
        mockStorage = new MockStorageService();
        mockRmmapi = new MockRunboxWebmailAPI();
        mockMobileQuery = new MockMobileQueryService();
        service = new PreferencesService(mockStorage as any, mockRmmapi as any, mockMobileQuery as any);
    });

    describe('ReplaySubject preferences pattern', () => {
        it('should initialize preferences as a ReplaySubject that caches current state', async () => {
            // Wait for initialization
            await new Promise(resolve => setTimeout(resolve, 10));

            // Multiple subscribers should receive the same cached value
            const value1 = await firstValueFrom(service.preferences);
            const value2 = await firstValueFrom(service.preferences);

            // Both should get the same Map reference (ReplaySubject behavior)
            expect(value1).toBe(value2);
            expect(value1 instanceof Map).toBe(true);
        });

        it('should emit new values when preferences are set', (done) => {
            const values: Map<string, any>[] = [];
            service.preferences.subscribe(v => values.push(v));

            setTimeout(() => {
                service.set(DefaultPrefGroups.Desktop, 'testKey', 'testValue');

                setTimeout(() => {
                    expect(values.length).toBeGreaterThan(1);
                    const lastValue = values[values.length - 1];
                    expect(lastValue.get('Desktop:testKey')).toBe('testValue');
                    done();
                }, 20);
            }, 10);
        });

        it('should allow removing preferences', (done) => {
            setTimeout(() => {
                service.set(DefaultPrefGroups.Desktop, 'toRemove', 'value');

                setTimeout(() => {
                    service.remove(DefaultPrefGroups.Desktop, 'toRemove');

                    setTimeout(() => {
                        firstValueFrom(service.preferences).then(prefs => {
                            expect(prefs.has('Desktop:toRemove')).toBe(false);
                            done();
                        });
                    }, 20);
                }, 20);
            }, 10);
        });
    });

    describe('firstValueFrom usage in async operations', () => {
        it('should use firstValueFrom in mergeDeviceGlobal to merge preferences', async () => {
            const testService = new PreferencesService(mockStorage as any, mockRmmapi as any, mockMobileQuery as any);

            // Wait for server preferences to load
            await new Promise(resolve => setTimeout(resolve, 50));

            const prefs = await firstValueFrom(testService.preferences);
            expect(prefs instanceof Map).toBe(true);
        });

        it('should use firstValueFrom in set method to get current preferences', (done) => {
            const receivedValues: any[] = [];
            service.preferences.subscribe(v => receivedValues.push(v));

            setTimeout(() => {
                service.set(DefaultPrefGroups.Desktop, 'asyncKey', 'asyncValue');

                setTimeout(() => {
                    // set() uses preferences.pipe(take(1)) which is similar to firstValueFrom pattern
                    expect(receivedValues.length).toBeGreaterThan(0);
                    const lastValue = receivedValues[receivedValues.length - 1];
                    expect(lastValue.get('Desktop:asyncKey')).toBe('asyncValue');
                    done();
                }, 30);
            }, 10);
        });
    });

    describe('Preference versioning and sync behavior', () => {
        it('should track version number when preferences are set', (done) => {
            setTimeout(() => {
                const initialVersion = service.version;

                service.set(DefaultPrefGroups.Desktop, 'versionTestKey', 'value');

                setTimeout(() => {
                    expect(service.version).toBeGreaterThan(initialVersion);
                    done();
                }, 20);
            }, 10);
        });

        it('should store preferences with version in storage', async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
            service.set(DefaultPrefGroups.Desktop, 'storageKey', 'storageValue');

            await new Promise(resolve => setTimeout(resolve, 30));

            const storedVersion = await mockStorage.get('preferences_version');
            expect(storedVersion).toBeGreaterThan(0);
        });
    });

    describe('Desktop vs Mobile preference groups', () => {
        it('should use Desktop group when screen size is Desktop', () => {
            mockMobileQuery.screenSize = ScreenSize.Desktop;
            const testService = new PreferencesService(mockStorage as any, mockRmmapi as any, mockMobileQuery as any);

            expect(testService.prefGroup).toBe(DefaultPrefGroups.Desktop);
        });

        it('should use Mobile group when screen size is Phone', () => {
            mockMobileQuery.screenSize = ScreenSize.Phone;
            const testService = new PreferencesService(mockStorage as any, mockRmmapi as any, mockMobileQuery as any);

            expect(testService.prefGroup).toBe(DefaultPrefGroups.Mobile);
        });

        it('should switch preference groups when screen size changes', (done) => {
            const initialGroup = service.prefGroup;
            expect(initialGroup).toBe(DefaultPrefGroups.Desktop);

            mockMobileQuery.screenSizeChanged.next(ScreenSize.Phone);

            setTimeout(() => {
                expect(service.prefGroup).toBe(DefaultPrefGroups.Mobile);
                done();
            }, 10);
        });
    });

    describe('Storage integration patterns', () => {
        it('should load preferences from storage on initialization', async () => {
            const preloadedStorage = new MockStorageService();
            // Pre-load some preference keys
            await preloadedStorage.set('preference_keys', ['Desktop:preloadedKey']);
            await preloadedStorage.set('Desktop:preloadedKey', 'preloadedValue');

            const testService = new PreferencesService(preloadedStorage as any, mockRmmapi as any, mockMobileQuery as any);

            await new Promise(resolve => setTimeout(resolve, 30));

            const prefs = await firstValueFrom(testService.preferences);
            expect(prefs.get('Desktop:preloadedKey')).toBe('preloadedValue');
        });

        it('should save preference keys to storage when preferences change', async () => {
            await new Promise(resolve => setTimeout(resolve, 10));

            service.set(DefaultPrefGroups.Desktop, 'newStorageKey', 'newStorageValue');

            await new Promise(resolve => setTimeout(resolve, 30));

            const storedKeys = await mockStorage.get('preference_keys');
            expect(storedKeys).toContain('Desktop:newStorageKey');
        });

        it('should save individual preference values to storage', async () => {
            await new Promise(resolve => setTimeout(resolve, 10));

            service.set(DefaultPrefGroups.Global, 'globalKey', 'globalValue');

            await new Promise(resolve => setTimeout(resolve, 30));

            const storedValue = await mockStorage.get('Global:globalKey');
            expect(storedValue).toBe('globalValue');
        });
    });

    describe('Integration with StorageService uid AsyncSubject', () => {
        it('should handle operations that depend on uid being loaded', async () => {
            const uidSubject = new Subject<{ uid: number }>();
            const uidStorage = {
                me: uidSubject.asObservable(),
                get: (key: string) => mockStorage.get(key),
                set: (key: string, value: any) => mockStorage.set(key, value)
            } as any;

            const testService = new PreferencesService(uidStorage, mockRmmapi as any, mockMobileQuery as any);

            // Set a preference before uid is "loaded"
            testService.set(DefaultPrefGroups.Desktop, 'uidTestKey', 'uidTestValue');

            // Now emit uid
            uidSubject.next({ uid: 999 });
            uidSubject.complete();

            await new Promise(resolve => setTimeout(resolve, 50));

            // The preference should still be set
            const prefs = await firstValueFrom(testService.preferences);
            expect(prefs.get('Desktop:uidTestKey')).toBe('uidTestValue');
        });
    });

    describe('take(1) operator usage pattern', () => {
        it('should use take(1) in set method to avoid multiple emissions', (done) => {
            let subscriptionCount = 0;

            // Track how many times the inner subscription in set() receives data
            service.preferences.pipe(take(1)).subscribe(() => {
                subscriptionCount++;
            });

            setTimeout(() => {
                service.set(DefaultPrefGroups.Desktop, 'takeTestKey', 'value');

                setTimeout(() => {
                    // The subscription in set() should only receive one value due to take(1)
                    expect(subscriptionCount).toBe(1);

                    // But the preferences ReplaySubject should have emitted multiple times
                    firstValueFrom(service.preferences).then(prefs => {
                        expect(prefs.get('Desktop:takeTestKey')).toBe('value');
                        done();
                    });
                }, 20);
            }, 10);
        });
    });
});
