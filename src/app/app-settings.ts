// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2020 Runbox Solutions AS (runbox.com).
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
import { BehaviorSubject } from 'rxjs';
import { StorageService } from './storage.service';
import { filter } from 'rxjs/operators';

export interface AppSettings {
    mailviewerContentPreview: boolean;
    showPopularRecipients:    boolean;
    avatars:                  AppSettings.AvatarSource;
}

export namespace AppSettings {
    export enum AvatarSource {
        NONE   = 'none',
        LOCAL  = 'local',
        REMOTE = 'remote',
    }

    export function getDefaults(): AppSettings {
        return {
            avatars: AvatarSource.LOCAL,
            mailviewerContentPreview: false,
            showPopularRecipients: true,
        };
    }

    export function load(stored: any): AppSettings {
        return Object.assign(getDefaults(), stored);
    }
}

@Injectable({ providedIn: 'root' })
export class AppSettingsService {
    settings: AppSettings = AppSettings.getDefaults();
    settingsSubject: BehaviorSubject<AppSettings> = new BehaviorSubject(AppSettings.getDefaults());

    constructor(
        private storage: StorageService,
    ) {
        this.storage.getSubject('webmailSettings').pipe(filter(s => s)).subscribe(
            (settings: any) => {
                this.settingsSubject.next(
                    this.settings = AppSettings.load(settings)
                );
                this.migrateOldSettings();
            }
        );
    }

    public store(): void {
        this.storage.set('webmailSettings', this.settings);
    }

    private migrateOldSettings(): void {
        const mailpreview = localStorage.getItem('rmm7mailViewerContentPreview');
        if (mailpreview) {
            this.settings.mailviewerContentPreview = mailpreview === 'true';
            localStorage.removeItem('rmm7mailViewerContentPreview');
            this.store();
        }
    }
}
