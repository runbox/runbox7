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

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { PreferencesService, DefaultPrefGroups } from './preferences.service';

export enum Theme {
    Light = 'light',
    Dark = 'dark',
    Auto = 'auto'
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
    private readonly THEME_PREF_KEY = 'themePreference';
    private currentTheme: BehaviorSubject<Theme> = new BehaviorSubject<Theme>(Theme.Dark);
    private activeTheme: BehaviorSubject<'light' | 'dark'> = new BehaviorSubject<'light' | 'dark'>('dark');

    public theme$: Observable<Theme> = this.currentTheme.asObservable();
    public activeTheme$: Observable<'light' | 'dark'> = this.activeTheme.asObservable();

    private mediaQueryList: MediaQueryList;

    constructor(private preferencesService: PreferencesService) {
        this.mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');

        // Apply default theme immediately to avoid white flash
        this.applyThemeToDocument('dark');

        this.preferencesService.preferences.subscribe(prefs => {
            const savedTheme = prefs.get(`${DefaultPrefGroups.Global}:${this.THEME_PREF_KEY}`);
            if (savedTheme && Object.values(Theme).includes(savedTheme)) {
                this.applyTheme(savedTheme);
            } else {
                this.applyTheme(Theme.Dark);
            }
        });

        this.mediaQueryList.addEventListener('change', (e) => {
            if (this.currentTheme.value === Theme.Auto) {
                this.updateActiveTheme();
            }
        });
    }

    setTheme(theme: Theme): void {
        this.preferencesService.set(DefaultPrefGroups.Global, this.THEME_PREF_KEY, theme);
        this.applyTheme(theme);
    }

    getTheme(): Theme {
        return this.currentTheme.value;
    }

    getActiveTheme(): 'light' | 'dark' {
        return this.activeTheme.value;
    }

    private applyTheme(theme: Theme): void {
        this.currentTheme.next(theme);
        this.updateActiveTheme();
    }

    private updateActiveTheme(): void {
        const theme = this.currentTheme.value;
        let effectiveTheme: 'light' | 'dark' = 'dark';

        if (theme === Theme.Light) {
            effectiveTheme = 'light';
        } else if (theme === Theme.Auto) {
            effectiveTheme = this.mediaQueryList.matches ? 'dark' : 'light';
        }

        if (effectiveTheme !== this.activeTheme.value) {
            this.activeTheme.next(effectiveTheme);
            this.applyThemeToDocument(effectiveTheme);
        }
    }

    private applyThemeToDocument(theme: 'light' | 'dark'): void {
        const htmlElement = document.documentElement;
        const bodyElement = document.body;

        if (theme === 'dark') {
            htmlElement.classList.add('dark-theme');
            bodyElement.classList.add('dark-theme');
        } else {
            htmlElement.classList.remove('dark-theme');
            bodyElement.classList.remove('dark-theme');
        }

        htmlElement.setAttribute('data-theme', theme);
        bodyElement.setAttribute('data-theme', theme);
    }

    toggleTheme(): void {
        const currentTheme = this.currentTheme.value;
        const newTheme = currentTheme === Theme.Light ? Theme.Dark : Theme.Light;
        this.setTheme(newTheme);
    }
}
