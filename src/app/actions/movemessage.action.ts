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
import { MatDialogRef } from '@angular/material/dialog';
import { RunboxWebmailAPI, FolderListEntry } from '../rmmapi/rbwebmail';

@Component({
    template: `
        <mat-spinner *ngIf="moving"></mat-spinner>
        <mat-dialog-content  *ngIf="!moving">
            <mat-nav-list dense>
                <mat-list-item *ngFor="let fce of folderListEntries" (click)="moveMessages(fce.folderId)"
                    [style.paddingLeft.px]="fce.folderLevel*10"
                >
                <mat-icon *ngIf="fce.folderType=='inbox'" mat-list-icon class="folderIconStandard" svgIcon="inbox-arrow-down"></mat-icon>
                <mat-icon *ngIf="fce.folderType=='sent'" mat-list-icon class="folderIconStandard" svgIcon="send"></mat-icon>
                <mat-icon *ngIf="fce.folderType=='spam'" mat-list-icon class="folderIconStandard" svgIcon="cancel"></mat-icon>
                <mat-icon *ngIf="fce.folderType=='templates'" mat-list-icon class="folderIconStandard" svgIcon="file-document"></mat-icon>
                <mat-icon *ngIf="fce.folderType=='trash'" mat-list-icon class="folderIconStandard" svgIcon="delete"></mat-icon>
                <mat-icon *ngIf="fce.folderType=='user'" mat-list-icon class="folderIconUser" svgIcon="folder"></mat-icon>
                    <p mat-line>{{fce.folderName}}</p>
                </mat-list-item>
            </mat-nav-list>
        </mat-dialog-content>
    `
})
export class MoveMessageDialogComponent implements OnInit {
    moving = false;
    folderListEntries: FolderListEntry[];

    constructor(
        public dialogRef: MatDialogRef<MoveMessageDialogComponent>,
        public rmmapi: RunboxWebmailAPI,
    ) {
    }

    ngOnInit() {
        this.rmmapi.getFolderList()
            .subscribe((folderListEntries) => this.folderListEntries = folderListEntries
                .filter(fce =>
                    fce.folderType !== 'drafts' &&
                    fce.folderType !== 'sent' &&
                    fce.folderType !== 'templates'
                ));
    }

    public moveMessages(folderId: number) {
        this.dialogRef.close(folderId);
    }
}
