// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2022 Runbox Solutions AS (runbox.com).
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
import { ReplaySubject } from 'rxjs';
import { take } from 'rxjs/operators';

import { StorageService } from '../storage.service';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { MobileQueryService, ScreenSize } from '../mobile-query.service';

export interface PreferencesStorage {
    version: number;
    entries: Map<string, any>;
}

export interface PreferencesResult {
    [name: string]: PreferencesStorage;
}

export enum DefaultPrefGroups {
    Global  = 'Global',
    Desktop = 'Desktop',
    Mobile  = 'Mobile',
}

@Injectable({ providedIn: 'root' })
export class PreferencesService {
    version = 0;
    loadedOldStyle = false;
    preferences: ReplaySubject<Map<string, any>> = new ReplaySubject(1);
    prefGroup = DefaultPrefGroups.Desktop;

    constructor(
        private storage: StorageService,
        private rmmapi: RunboxWebmailAPI,
        private mobileQuery: MobileQueryService,
    ) {
        this.loadOldStyle(DefaultPrefGroups.Global);
        this.mobileQuery.screenSizeChanged.subscribe(size => {
            let prefGroup = DefaultPrefGroups.Desktop;
            if (size !== ScreenSize.Desktop) {
                prefGroup = DefaultPrefGroups.Mobile;
            }
            this.loadOldStyle(prefGroup);
            if (prefGroup !== this.prefGroup) {
                // FIXME: Reload prefs here?
                this.prefGroup = prefGroup;
            }
        });

        // Preferences all have defaults (set where used)
        // We store a list of changed preference keys
        // and a value for each key (size per item is limited)
        // We fetch first from the browser storage (quicker)
        // Then from the backend, which we sync/overwrite the local storage with
        // We need to pull both "global" and "this device" (desktop/mobile)
        // do we store separately?
        // console.log('constructor, pull from storage');
        this.storage.get('preference_keys').then((prefkeys: string[]) => {
            if (!prefkeys) {
                prefkeys = [];
            }
            const prefs: Map<string, any> = new Map();
            Promise.all(prefkeys.map((key) => {
                return this.storage.get(key).then((value: any) => {
                    if (value) {
                        prefs.set(key, value);
                    }
                });
            })).then(() => this.preferences.next(prefs));
            storage.get('preferences_version').then((pv) => {
                if (pv) {
                    this.version = pv;
                }
            });
        });
        // console.log('constructor, getPrefs');
        this.rmmapi.getPreferences().subscribe((prefsdata: PreferencesResult) => {
            // this returns a PrefSet => PreferencesStorage object
            // with a version key
            // eg: { "Global": { "version": 1, "entries": { "calendarSettings" .. } },
            //        "Desktop": ..  }
            // Currently we support Global, Desktop, Mobile
            // Build a set of prefs from Global with <Desktop|Mobile> overlaid

            // console.log('got prefs:');
            // console.log(prefsdata);

            if (this.mobileQuery.screenSize !== ScreenSize.Desktop) {
                console.log('screensize is not desktop');

                this.prefGroup = DefaultPrefGroups.Mobile;
            }
            // console.log('merge');
            this.mergeDeviceGlobal(this.prefGroup, prefsdata);
        });

    }

    set(level: string, key: string, entry: any): void {
        this.preferences.pipe(take(1)).subscribe(entries => {
            if (JSON.stringify(entries.get(`${level}:${key}`)) !== JSON.stringify(entry)) {
                entries.set(`${level}:${key}`, entry);
                this.updateEntries(level, entries);
            }
        });
    }

    remove(level: string, key: string): void {
        this.preferences.pipe(take(1)).subscribe(entries => {
            entries.delete(`${level}:${key}`);
            this.updateEntries(level, entries);
        });
    }

    private async mergeDeviceGlobal(level: string, prefsdata: PreferencesResult) {
        // Default missing values from database:
        if (!prefsdata[DefaultPrefGroups.Global]) {
            prefsdata[DefaultPrefGroups.Global] = {
                'entries': new Map<string, any>(),
                'version': 0
            };
        }
        if (!prefsdata[level]) {
            prefsdata[level] = {
                'entries': new Map<string, any>(),
                'version': 0
            };
        }

        const allPrefs = await this.preferences.pipe(take(1)).toPromise();
        Object.keys(prefsdata[DefaultPrefGroups.Global]['entries']).forEach((key) => {
            allPrefs.set(`${DefaultPrefGroups.Global}:${key}`, prefsdata[DefaultPrefGroups.Global]['entries'][key]);
        });
        Object.keys(prefsdata[level]['entries']).forEach((key) => {
            allPrefs.set(`${level}:${key}`, prefsdata[level]['entries'][key]);
        });
        const version = Math.max(prefsdata[DefaultPrefGroups.Global]['version'], prefsdata[level]['version']);

        this.applySyncedData(level, {version: version, entries: allPrefs});
    }

    private updateEntries(level: string, entries: Map<string, any>): void {
        this.preferences.next(entries);
        this.version++;
        // Version
        this.storage.set('preferences_version', this.version);
        // Keys:
        const pref_keys = entries.keys();
        this.storage.set('preference_keys', Array.from(pref_keys));
        // Values
        entries.forEach((value, key) => {
            this.storage.set(key, value);
        });
        this.uploadPreferenceData(level);
    }

    private async uploadPreferenceData(level: string) {
        const prefs = await this.preferences.pipe(take(1)).toPromise();
        const entriesObj = {};
        prefs.forEach((value, key) => {
            // for (const [key, value] of prefs) {
            const levelkey = key.split(':');
            if (levelkey[0] === level) {
                entriesObj[levelkey[1]] = value;
            }
        });
        const data = {
            'key':   level,
            'value': {
                'version': this.version,
                'entries': entriesObj,
                // This magic is way too new apparently..
                // Object.fromEntries(prefs.entries)
            }
        };
        this.rmmapi.setPreferences(level, data).subscribe(
            newData => this.mergeDeviceGlobal(level, newData)
        );
    }

    private applySyncedData(level: string, prefsdata: PreferencesStorage): void {
        // Remote has an older copy, save ours
        if (prefsdata.version < this.version) {
            this.uploadPreferenceData(level);
        }
        if (prefsdata.version > this.version) {
            this.updateEntries(level, prefsdata.entries);
            // this.preferences.next(prefsdata.entries);
            this.version = prefsdata.version;
        }
    }

    // TODO: Remove after November 2023 ?
    private async loadOldStyle(level: string) {
        if (this.loadedOldStyle) {
            return;
        }
        let prefs = await this.preferences.pipe(take(1)).toPromise();
        if (!prefs) {
            // Already set / imported
            prefs = new Map<string, any>();
        }

        const LOCAL_STORAGE_SETTING_MAILVIEWER_ON_RIGHT_SIDE_IF_MOBILE = 'mailViewerOnRightSideIfMobile';
        const LOCAL_STORAGE_SETTING_MAILVIEWER_ON_RIGHT_SIDE = 'mailViewerOnRightSide';
        const LOCAL_STORAGE_VIEWMODE = 'rmm7mailViewerViewMode';
        const LOCAL_STORAGE_SHOWCONTENTPREVIEW = 'rmm7mailViewerContentPreview';
        const LOCAL_STORAGE_KEEP_PANE = 'keepMessagePaneOpen';
        const LOCAL_STORAGE_SHOW_UNREAD_ONLY = 'rmm7mailViewerShowUnreadOnly';
        const showHtmlDecisionKey = 'rmm7showhtmldecision';
        const showImagesDecisionKey = 'rmm7showimagesdecision';
        const resizerPercentageKey = 'rmm7resizerpercentage';

        const uid = await this.storage.uid.toPromise();
        if (level === DefaultPrefGroups.Global) {

            if (localStorage.getItem('rmm7experimentalFeatureEnabled') === 'true') {
                prefs.set('Global:experimentalFeatureEnabled', true);
            }
            prefs.set(`Global:${LOCAL_STORAGE_SHOW_UNREAD_ONLY}`, localStorage.getItem(LOCAL_STORAGE_SHOW_UNREAD_ONLY) === 'true');
            prefs.set(`Global:messageSubjectDragTipShown`, localStorage.getItem('messageSubjectDragTipShown') === 'true');
            const calendarSettings = localStorage.getItem('calendarSettings');
            if (calendarSettings) {
                prefs.set(`Global:calendarSettings`, JSON.parse(calendarSettings));
            }
            const avatarCache = localStorage.getItem(`${uid}:avatarCache`);
            if (avatarCache) {
                prefs.set(`Global:avatarCache`, JSON.parse(avatarCache));
            }
        } else {
            const storedMailViewerOrientationSetting = localStorage.getItem(LOCAL_STORAGE_SETTING_MAILVIEWER_ON_RIGHT_SIDE);
            if (storedMailViewerOrientationSetting !== undefined) {
                prefs.set(`${level}:${LOCAL_STORAGE_SETTING_MAILVIEWER_ON_RIGHT_SIDE}`, storedMailViewerOrientationSetting);
            }
            const storedMailViewerOrientationSettingMobile = localStorage.getItem(LOCAL_STORAGE_SETTING_MAILVIEWER_ON_RIGHT_SIDE_IF_MOBILE);
            if (storedMailViewerOrientationSettingMobile !== undefined) {
                prefs.set(`${level}:${LOCAL_STORAGE_SETTING_MAILVIEWER_ON_RIGHT_SIDE_IF_MOBILE}`, storedMailViewerOrientationSettingMobile);
            }
            prefs.set(`${level}:${LOCAL_STORAGE_SHOWCONTENTPREVIEW}`, localStorage.getItem(LOCAL_STORAGE_SHOWCONTENTPREVIEW) === 'true');
            prefs.set(`${level}:${LOCAL_STORAGE_KEEP_PANE}`, localStorage.getItem(LOCAL_STORAGE_KEEP_PANE) === 'true');
            prefs.set(`${level}:showDragHelpers`, localStorage.getItem('contacts.showDragHelpers') === '1');

            if (localStorage.getItem(LOCAL_STORAGE_VIEWMODE)) {
                prefs.set(`${level}:${LOCAL_STORAGE_VIEWMODE}`, localStorage.getItem(LOCAL_STORAGE_VIEWMODE));
            }
            const avatarSource = localStorage.getItem(`${uid}:avatars`);
            if (avatarSource) {
                prefs.set(`${level}:avatarSource`, JSON.parse(avatarSource));
            }
            const htmlDecision = localStorage.getItem(showHtmlDecisionKey);
            if (htmlDecision) {
                prefs.set(`${level}:${showHtmlDecisionKey}`, htmlDecision);
            }
            const imagesDecision = localStorage.getItem(showImagesDecisionKey);
            if (imagesDecision) {
                prefs.set(`${level}:${showImagesDecisionKey}`, imagesDecision);
            }
            const resizerPercentage = localStorage.getItem(resizerPercentageKey);
            if (resizerPercentage) {
                prefs.set(`${level}:${resizerPercentageKey}`, htmlDecision);
            }

            const searchPrompt = localStorage.getItem(`localSearchPromptDisplayed${uid}`);
            if (searchPrompt) {
                prefs.set(`${level}:localSearchPromptDisplayed`, searchPrompt);
            }
            this.loadedOldStyle = true;
        }

        // localStorage.removeItem('rmm7experimentalFeatureEnabled');
        // localStorage.removeItem(LOCAL_STORAGE_SETTING_MAILVIEWER_ON_RIGHT_SIDE);
        // localStorage.removeItem(LOCAL_STORAGE_SETTING_MAILVIEWER_ON_RIGHT_SIDE_IF_MOBILE);
        // localStorage.removeItem(LOCAL_STORAGE_SHOWCONTENTPREVIEW);
        // localStorage.removeItem(LOCAL_STORAGE_KEEP_PANE);
        // localStorage.removeItem(LOCAL_STORAGE_SHOW_UNREAD_ONLY);
        // localStorage.removeItem('messageSubjectDragTipShown');
        // localStorage.removeItem(LOCAL_STORAGE_VIEWMODE);
        // localStorage.removeItem('calendarSettings');
        // localStorage.removeItem(`${uid}:avatars`);
        // localStorage.removeItem(`${uid}:${showHtmlDecisionKey}`);
        // localStorage.removeItem(`${uid}:${showImagesDecisionKey}`);
        // localStorage.removeItem(`${uid}:${resizerPercentageKey}`);
        this.preferences.next(prefs);
    }
}
