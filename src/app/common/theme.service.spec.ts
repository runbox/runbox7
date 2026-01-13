// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2025 Runbox Solutions AS (runbox.com).
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
import { ReplaySubject } from 'rxjs';
import { DefaultPrefGroups, PreferencesService } from './preferences.service';
import { Theme, ThemeService } from './theme.service';

class PreferencesServiceStub {
    preferences = new ReplaySubject<Map<string, any>>(1);
    prefGroup = DefaultPrefGroups.Desktop;
    private entries = new Map<string, any>();

    constructor() {
        this.preferences.next(this.entries);
    }

    set(level: string, key: string, entry: any): void {
        this.entries.set(`${level}:${key}`, entry);
        this.preferences.next(this.entries);
    }

    emit(entries: Map<string, any>): void {
        this.entries = entries;
        this.preferences.next(this.entries);
    }
}

const clearThemeClasses = () => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.remove('dark-theme', 'christmas-theme', 'high-contrast-theme', 'terminal-theme');
    body.classList.remove('dark-theme', 'christmas-theme', 'high-contrast-theme', 'terminal-theme');
    root.removeAttribute('data-theme');
    body.removeAttribute('data-theme');
};

describe('ThemeService', () => {
    let service: ThemeService;
    let preferences: PreferencesServiceStub;

    beforeEach(() => {
        spyOn(window, 'matchMedia').and.callFake((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            addListener: () => {},
            removeListener: () => {},
            dispatchEvent: () => false
        }) as MediaQueryList);

        preferences = new PreferencesServiceStub();

        TestBed.configureTestingModule({
            providers: [
                ThemeService,
                { provide: PreferencesService, useValue: preferences }
            ]
        });

        service = TestBed.inject(ThemeService);
    });

    afterEach(() => {
        clearThemeClasses();
    });

    it('setTheme updates data-theme and adds dark theme classes', () => {
        service.setTheme(Theme.Dark);

        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(document.body.getAttribute('data-theme')).toBe('dark');
        expect(document.documentElement.classList.contains('dark-theme')).toBeTrue();
        expect(document.body.classList.contains('dark-theme')).toBeTrue();
        expect(document.documentElement.classList.contains('terminal-theme')).toBeFalse();
        expect(document.body.classList.contains('terminal-theme')).toBeFalse();
    });

    it('setTheme updates data-theme and adds terminal theme classes', () => {
        service.setTheme(Theme.Terminal);

        expect(document.documentElement.getAttribute('data-theme')).toBe('terminal');
        expect(document.body.getAttribute('data-theme')).toBe('terminal');
        expect(document.documentElement.classList.contains('terminal-theme')).toBeTrue();
        expect(document.body.classList.contains('terminal-theme')).toBeTrue();
        expect(document.documentElement.classList.contains('dark-theme')).toBeFalse();
        expect(document.body.classList.contains('dark-theme')).toBeFalse();
    });

    it('does not change theme when preferences emit without themePreference', () => {
        service.setTheme(Theme.Terminal);

        const newPrefs = new Map<string, any>();
        newPrefs.set(`${DefaultPrefGroups.Desktop}:unrelatedPref`, 'value');
        preferences.emit(newPrefs);

        expect(service.getTheme()).toBe(Theme.Terminal);
        expect(document.documentElement.getAttribute('data-theme')).toBe('terminal');
        expect(document.documentElement.classList.contains('terminal-theme')).toBeTrue();
    });
});
