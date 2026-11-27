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

import { Component, OnInit } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { FolderListEntry } from '../common/folderlistentry';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';

@Component({
    template: `
        <mat-spinner *ngIf="moving"></mat-spinner>
        <mat-dialog-content *ngIf="!moving" class="moveMessagesToFolderContent">
            <mat-form-field class="moveMessagesFolderFilter">
                <mat-label>Search folders</mat-label>
                <input matInput
                    type="search"
                    autocomplete="off"
                    [(ngModel)]="folderFilter"
                    (ngModelChange)="updateFolderFilter()"
                >
            </mat-form-field>

            <mat-nav-list *ngIf="filteredFolderListEntries.length" dense id="moveMessagesToFolderList">
                <mat-list-item *ngFor="let fce of filteredFolderListEntries" (click)="moveMessages(fce.folderId)"
                    [style.paddingLeft.px]="fce.folderLevel*10"
                >
                <mat-icon *ngIf="fce.folderType==='inbox'" mat-list-icon class="folderIconStandard" svgIcon="inbox-arrow-down"></mat-icon>
                <mat-icon *ngIf="fce.folderType==='sent'" mat-list-icon class="folderIconStandard" svgIcon="send"></mat-icon>
                <mat-icon *ngIf="fce.folderType==='spam'" mat-list-icon class="folderIconStandard" svgIcon="cancel"></mat-icon>
                <mat-icon *ngIf="fce.folderType==='templates'" mat-list-icon class="folderIconStandard" svgIcon="file-document"></mat-icon>
                <mat-icon *ngIf="fce.folderType==='trash'" mat-list-icon class="folderIconStandard" svgIcon="delete"></mat-icon>
                <mat-icon *ngIf="fce.folderType==='user'" mat-list-icon class="folderIconUser" svgIcon="folder"></mat-icon>
                    <p mat-line>{{fce.folderName}}</p>
                </mat-list-item>
            </mat-nav-list>
            <p *ngIf="folderListEntries.length && !filteredFolderListEntries.length" class="moveMessagesNoMatches">
                No matching folders
            </p>
        </mat-dialog-content>
    `,
    styles: [`
        .moveMessagesToFolderContent {
            min-width: min(420px, 90vw);
        }

        .moveMessagesFolderFilter {
            width: 100%;
        }

        .moveMessagesNoMatches {
            margin: 12px 0;
            opacity: 0.75;
        }
    `]
})
export class MoveMessageDialogComponent implements OnInit {
    moving = false;
    folderFilter = '';
    folderListEntries: FolderListEntry[] = [];
    filteredFolderListEntries: FolderListEntry[] = [];

    constructor(
        public dialogRef: MatDialogRef<MoveMessageDialogComponent>,
        public rmmapi: RunboxWebmailAPI,
    ) {
    }

    ngOnInit() {
        this.rmmapi.getFolderList()
            .subscribe((folderListEntries) => {
                this.folderListEntries = folderListEntries
                .filter(fce =>
                    fce.folderType !== 'drafts' &&
                    fce.folderType !== 'sent' &&
                    fce.folderType !== 'templates'
                );
                this.updateFolderFilter();
            });
    }

    public updateFolderFilter() {
        const folderFilter = this.folderFilter.trim().toLowerCase();
        if (!folderFilter) {
            this.filteredFolderListEntries = this.folderListEntries;
            return;
        }

        this.filteredFolderListEntries = this.folderListEntries.filter(fce =>
            fce.folderName.toLowerCase().includes(folderFilter) ||
            fce.folderPath.toLowerCase().includes(folderFilter)
        );
    }

    public moveMessages(folderId: number) {
        this.dialogRef.close(folderId);
    }
}
