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
    Christmas = 'christmas',
    HighContrast = 'high-contrast',
    Terminal = 'terminal',
    Auto = 'auto'
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
    private readonly THEME_PREF_KEY = 'themePreference';
    private mediaQueryList: MediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
    private currentTheme: BehaviorSubject<Theme> = new BehaviorSubject<Theme>(Theme.Auto);
    private activeTheme: BehaviorSubject<'light' | 'dark'> = new BehaviorSubject<'light' | 'dark'>(
        this.mediaQueryList.matches ? 'dark' : 'light'
    );

    public theme$: Observable<Theme> = this.currentTheme.asObservable();
    public activeTheme$: Observable<'light' | 'dark'> = this.activeTheme.asObservable();

    constructor(private preferencesService: PreferencesService) {
        // Apply OS-preferred theme immediately to avoid flash
        this.applyThemeToDocument(this.mediaQueryList.matches ? 'dark' : 'light');

        this.preferencesService.preferences.subscribe(prefs => {
            const savedTheme = prefs.get(`${DefaultPrefGroups.Global}:${this.THEME_PREF_KEY}`);
            if (savedTheme && Object.values(Theme).includes(savedTheme)) {
                // Only apply if different from current theme to avoid unnecessary reapplication
                if (savedTheme !== this.currentTheme.value) {
                    this.applyTheme(savedTheme);
                }
            }
            // Don't fall back to Dark if theme preference is missing from this emission
            // This prevents theme from changing when other preferences are saved
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

        if (theme === Theme.Light || theme === Theme.Christmas) {
            effectiveTheme = 'light';
        } else if (theme === Theme.HighContrast || theme === Theme.Terminal) {
            effectiveTheme = 'dark'; // High contrast and terminal use dark as base
        } else if (theme === Theme.Auto) {
            effectiveTheme = this.mediaQueryList.matches ? 'dark' : 'light';
        }

        // Emit on every theme change so non-light/dark themes still refresh subscribers.
        this.activeTheme.next(effectiveTheme);

        if (theme === Theme.Christmas) {
            this.applyThemeToDocument('christmas');
            return;
        }

        if (theme === Theme.HighContrast) {
            this.applyThemeToDocument('high-contrast');
            return;
        }

        if (theme === Theme.Terminal) {
            this.applyThemeToDocument('terminal');
            return;
        }

        this.applyThemeToDocument(effectiveTheme);
    }

    private applyThemeToDocument(theme: 'light' | 'dark' | 'christmas' | 'high-contrast' | 'terminal'): void {
        const htmlElement = document.documentElement;
        const bodyElement = document.body;

        // Remove all theme classes
        htmlElement.classList.remove('dark-theme', 'christmas-theme', 'high-contrast-theme', 'terminal-theme');
        bodyElement.classList.remove('dark-theme', 'christmas-theme', 'high-contrast-theme', 'terminal-theme');

        // Add the appropriate theme class
        if (theme === 'dark') {
            htmlElement.classList.add('dark-theme');
            bodyElement.classList.add('dark-theme');
        } else if (theme === 'christmas') {
            htmlElement.classList.add('christmas-theme');
            bodyElement.classList.add('christmas-theme');
        } else if (theme === 'high-contrast') {
            htmlElement.classList.add('high-contrast-theme');
            bodyElement.classList.add('high-contrast-theme');
        } else if (theme === 'terminal') {
            htmlElement.classList.add('terminal-theme');
            bodyElement.classList.add('terminal-theme');
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
