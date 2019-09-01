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

import { Component, EventEmitter, Output, ElementRef, ViewChild } from '@angular/core';
import { MatDialog, MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material';
import { ConfirmDialog } from '../dialog/dialog.module';
import { MessageListService } from '../rmmapi/messagelist.service';
import { FolderCountEntry, RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { SimpleInputDialog, SimpleInputDialogParams } from '../dialog/simpleinput.dialog';

import { Observable } from 'rxjs';
import { first, map, filter, mergeMap, take } from 'rxjs/operators';
import { FlatTreeControl } from '@angular/cdk/tree';

class FolderNode {
    children: FolderNode[];
    data: FolderCountEntry;
}

export enum DropPosition {
    NONE,
    ABOVE,
    BELOW,
    INSIDE
}

@Component({
    moduleId: 'angular2/app/folder/',
    templateUrl: 'folderlist.component.html',
    // tslint:disable-next-line:component-selector
    selector: 'rmm-folderlist',
    styleUrls: ['folderlist.component.css']
})
export class FolderListComponent {
    selectedFolder = 'Inbox';

    dropFolderId: number;
    dropPosition = DropPosition;
    dropAboveOrBelowOrInside: DropPosition = DropPosition.NONE;
    dragFolderInProgress = false;

    folders: Observable<Array<FolderCountEntry>>;

    @Output() droppedToFolder = new EventEmitter<number>();
    @Output() folderSelected = new EventEmitter<string>();

    treeControl: FlatTreeControl<FolderCountEntry>;
    treeFlattener: MatTreeFlattener<FolderNode, FolderCountEntry>;
    dataSource: MatTreeFlatDataSource<FolderNode, FolderCountEntry>;

    storedexpandedFolderIds: number[] = [];
    constructor(
        public messagelistservice: MessageListService,
        public rmmapi: RunboxWebmailAPI,
        public dialog: MatDialog
    ) {

        try {
            const storedExpandedFolderIds = JSON.parse(localStorage.getItem('rmm7expandedfolderids'));
            if (storedExpandedFolderIds && storedExpandedFolderIds.length > 0) {
                this.storedexpandedFolderIds = storedExpandedFolderIds;
            }
        } catch (e) {}

        this.folders = this.messagelistservice.folderCountSubject;
        this.treeControl = new FlatTreeControl<FolderCountEntry>(this._getLevel, this._isExpandable);
        this.treeFlattener = new MatTreeFlattener(
            (node: FolderNode, level: number): FolderCountEntry => {
                return node.data;
            },
            this._getLevel,
            this._isExpandable,
            (node: FolderNode) => node.children
        );
        this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

        const foldertreedataobservable = this.folders
            .pipe(
                map(folders => folders.filter(f => f.folderPath !== 'Drafts')),
                map((folders) => {
                const treedata: FolderNode[] = [];

                let currentFolderLevel = 0;
                const parentStack: FolderNode[] = [];
                let previousNode: FolderNode = null;

                folders.forEach((folderCountEntry, ndx) => {
                    const folderNode: FolderNode = { children: [], data: folderCountEntry};

                    if (folderCountEntry.folderLevel > currentFolderLevel) {
                        currentFolderLevel = folderCountEntry.folderLevel;
                        parentStack.push(previousNode);
                    } else if (folderCountEntry.folderLevel < currentFolderLevel) {
                        currentFolderLevel = folderCountEntry.folderLevel;
                        parentStack.pop();
                    }
                    if (parentStack.length > 0) {
                        const currentParent = parentStack[parentStack.length - 1];
                        currentParent.children.push(folderNode);
                        currentParent.data.isExpandable = true;
                    } else {
                        treedata.push(folderNode);
                    }

                    const storedexpandedFolderId = this.storedexpandedFolderIds
                                .find(fid => fid === folderCountEntry.folderId);
                    if (storedexpandedFolderId) {
                        this.treeControl.expand(folderCountEntry);
                    }

                    previousNode = folderNode;
                });

                return treedata;
            })
        );
        foldertreedataobservable.subscribe(treedata => {
            this.dataSource.data = treedata;
        });
        this.treeControl.expansionModel.changed.subscribe(state => {
                state.added.forEach(added => {
                    if (this.storedexpandedFolderIds.findIndex(fid => fid === added.folderId) === -1) {
                        this.storedexpandedFolderIds.push(added.folderId);
                    }
                });
                this.storedexpandedFolderIds = this.storedexpandedFolderIds
                        .filter(fid =>
                    state.removed.findIndex(removed => removed.folderId === fid) === -1
                );
                localStorage.setItem('rmm7expandedfolderids',
                    JSON.stringify(this.storedexpandedFolderIds)
                );
            });
    }

    private _getLevel = (node: FolderCountEntry) => node.folderLevel;
    private _isExpandable = (node: FolderCountEntry) => node.isExpandable ? true : false;

    /**
     * Folderlist entry is 48 pixels, so if mouse is in the upper region suggest dropping above,
     * if in the middle suggest inside, or suggest below if in the lower region
     * 
     * @param offsetY 
     * @returns drop position above, below or inside (see enum DropPosition)
     */
    isDropAboveOrBelowOrInside(offsetY: number): DropPosition {
        const treeNodeHeight = (document.querySelector('mat-tree-node.mailFolder') as HTMLElement).offsetHeight;
        const paddingPixelsAboveBelow = 7;
        if (offsetY < paddingPixelsAboveBelow && offsetY >= 0) {
            return DropPosition.ABOVE;
        } else if (offsetY > (treeNodeHeight - paddingPixelsAboveBelow) && offsetY <= treeNodeHeight) {
            return DropPosition.BELOW;
        } else {
            return DropPosition.INSIDE;
        }
    }

    allowDropToFolder(event: DragEvent, node: FolderCountEntry): void {
        if (this.dragFolderInProgress) {
            this.dropAboveOrBelowOrInside = this.isDropAboveOrBelowOrInside(event.offsetY);
        } else {
            this.dropAboveOrBelowOrInside = DropPosition.INSIDE;
        }
        this.dropFolderId = node.folderId;

        this.treeControl.expand(node);
        event.preventDefault();
    }

    dropToFolder(event: DragEvent, folderId: number): void {
        const eventText = event.dataTransfer.getData('text');
        if (eventText.indexOf('folderId:') === 0) {
            this.folderReorderingDrop(parseInt(eventText.substr('folderId:'.length), 10),
                folderId, this.isDropAboveOrBelowOrInside(event.offsetY));
        } else {
            this.droppedToFolder.emit(folderId);
        }
        this.dropAboveOrBelowOrInside = DropPosition.NONE;
        this.dragFolderInProgress = false;
        this.dropFolderId = 0;
    }

    dragFolderStart(event, folderId: NumberConstructor): void {
        event.dataTransfer.dropEffect = 'move';
        event.dataTransfer.setData('text/plain', 'folderId:' + folderId);
        this.dragFolderInProgress = true;
    }

    dragCancel() {
        this.dropFolderId = 0;
        this.dragFolderInProgress = false;
        this.dropAboveOrBelowOrInside = DropPosition.NONE;
    }

    clearSelection() {
        this.selectedFolder = null;
    }

    selectFolder(folder: string): void {
        if (folder !== this.selectedFolder) {
            this.selectedFolder = folder;
            this.messagelistservice.setCurrentFolder(folder);
        }
        this.folderSelected.next(folder);
    }

    addFolder(): void {
        this.messagelistservice.folderCountSubject
            .pipe(
                first(),
                map(folders =>
                    folders.find(fld =>
                        fld.folderPath === this.selectedFolder)
                )
            ).subscribe(selectedFolder => {
                const parentFolderId = selectedFolder && selectedFolder.folderType === 'user' ? selectedFolder.folderId : 0;
                const parentFolderName = this.selectedFolder.replace(/\./g, ' / ');

                const dialogRef = this.dialog.open(SimpleInputDialog, {
                    data:
                        new SimpleInputDialogParams('Add new folder',
                            parentFolderId ?
                                `Create new folder under ${parentFolderName}` :
                                'Create new root level folder',
                            'New folder name',
                            (value: string) => value && value.trim().length > 0
                        )
                }
                );
                dialogRef.afterClosed().pipe(
                    filter(res => res && res.length > 0),
                    mergeMap(newFolderName => this.rmmapi.createFolder(parentFolderId, newFolderName))
                ).subscribe(() => this.messagelistservice.refreshFolderCount());
            });
    }

    renameFolder(folder: FolderCountEntry): void {
        const dialogRef = this.dialog.open(SimpleInputDialog, {
            data:
                new SimpleInputDialogParams('Rename folder',
                    `Rename folder ${folder.folderName}`,
                    'New folder name',
                    (value: string) => value && value.trim().length > 0
                )
        }
        );
        dialogRef.afterClosed().pipe(
            filter(res => res && res.length > 0),
            mergeMap(newFolderName => this.rmmapi.renameFolder(folder.folderId, newFolderName))
        ).subscribe(() => this.messagelistservice.refreshFolderCount());
    }

    deleteFolder(folder: FolderCountEntry): void {
        const confirmDialog = this.dialog.open(ConfirmDialog);
        confirmDialog.componentInstance.title = `Delete folder ${folder.folderName}?`;
        confirmDialog.componentInstance.question =
            `Are you sure that you want to delete the folder named ${folder.folderName}?`;
        confirmDialog.componentInstance.noOptionTitle = 'cancel';
        confirmDialog.componentInstance.yesOptionTitle = 'ok';
        confirmDialog.afterClosed().pipe(
            filter(res => res === true),
            mergeMap(() => this.rmmapi.deleteFolder(folder.folderId))
        ).subscribe(() => this.messagelistservice.refreshFolderCount());
    }

    async folderReorderingDrop(sourceFolderId: number, destinationFolderId: number, aboveOrBelowOrInside: number) {
        if (sourceFolderId === destinationFolderId) {
            // can't move a folder above, below or inside itself
            return;
        }

        const folders = await this.messagelistservice.folderCountSubject.pipe(take(1)).toPromise();
        let sourceIndex = folders.findIndex(fld => fld.folderId === sourceFolderId);
        let destinationIndex = folders.findIndex(folder => folder.folderId === destinationFolderId);

        console.log(`move folder ${folders[sourceIndex].folderPath} ${
                            aboveOrBelowOrInside === DropPosition.ABOVE ? 'above' :
                            aboveOrBelowOrInside === DropPosition.BELOW ? 'below' :
                            aboveOrBelowOrInside === DropPosition.INSIDE ? 'inside' : ''
                        } ${folders[destinationIndex].folderPath}`);

        let destinationFolderLevel = 0;
        let destinationParent = '';

        const getParentFromFolderPath = folderPath => {
            const pathArr = folderPath.split('/');
            return pathArr.slice(0, pathArr.length - 1).join('/');
        };

        let moveCount = 1;
        while ( sourceIndex + moveCount < folders.length &&
                folders[sourceIndex + moveCount].folderLevel > folders[sourceIndex].folderLevel) {
            // also move all sub folders if any
            moveCount ++;
        }

        switch (aboveOrBelowOrInside) {
            case DropPosition.ABOVE:
                // above
                destinationFolderLevel = folders[destinationIndex].folderLevel;
                destinationParent = getParentFromFolderPath(folders[destinationIndex].folderPath);
                if (destinationIndex > sourceIndex) {
                    destinationIndex -=  moveCount;
                }
                break;
            case DropPosition.BELOW:
                // below
                destinationFolderLevel = folders[destinationIndex].folderLevel;
                destinationParent = getParentFromFolderPath(folders[destinationIndex].folderPath);

                const sourceIndexAfterDestination = sourceIndex > destinationIndex;
                while (
                    folders.length > (destinationIndex + 1) &&
                    folders[destinationIndex + 1].folderLevel > destinationFolderLevel ) {
                    // handle if the folder we're moving below has subfolders
                    destinationIndex ++;
                }

                if (sourceIndexAfterDestination && sourceIndex <= destinationIndex) {
                    // sourceIndex was within the subfolders
                    console.log('source was within subfolders');
                    destinationIndex --;
                }

                if (destinationIndex > sourceIndex) {
                    destinationIndex -= (moveCount - 1);
                } else if ((destinationIndex + 1) < folders.length) {
                    destinationIndex++;
                }
                break;
            case DropPosition.INSIDE:
                // inside
                destinationFolderLevel = folders[destinationIndex].folderLevel + 1;
                destinationParent =  folders[destinationIndex].folderPath;

                if (destinationIndex > sourceIndex) {
                    destinationIndex -= (moveCount - 1);
                } else {
                    destinationIndex++;
                }
                break;
        }


        const sourceParent = getParentFromFolderPath(folders[sourceIndex].folderPath);
        const sourceFolderLevel = folders[sourceIndex].folderLevel;

        // Change folderlevels and parents
        for (let n = 0; n < moveCount; n++) {
            const folder = folders[sourceIndex + n];

            folder.folderPath =
                `${destinationParent}${destinationParent.length > 0 ? '/' : ''}` +
                `${folder.folderPath.substring(sourceParent.length ? sourceParent.length + 1 : 0)}`;
            folder.folderLevel = folder.folderLevel - sourceFolderLevel + destinationFolderLevel;
        }

        while (sourceIndex > destinationIndex) {
            const tempFolder = folders[sourceIndex - 1];
            folders.copyWithin(sourceIndex - 1, sourceIndex, sourceIndex + moveCount);
            sourceIndex--;
            folders[sourceIndex + moveCount] = tempFolder;
        }

        while (sourceIndex < destinationIndex) {
            const tempFolder = folders[sourceIndex + moveCount];
            folders.copyWithin(sourceIndex + 1, sourceIndex, sourceIndex + moveCount);
            folders[sourceIndex] = tempFolder;
            sourceIndex++;
        }

        // console.log('after rearrange', folders.map(f => `${f.folderId} ${f.folderPath}`));

        this.messagelistservice.folderCountSubject.next(folders);

        const newParentFolderId = destinationParent ? folders.find(fld => fld.folderPath === destinationParent).folderId : 0;
        await this.rmmapi.moveFolder(sourceFolderId, newParentFolderId).toPromise();
    }

    async emptyTrash() {
        const trashFolderName = await this.folders.pipe(
            map(folders => folders.find(f => f.folderType === 'trash').folderName),
            take(1)
        ).toPromise();

        if (trashFolderName) {
            console.log('found trash folder with name', trashFolderName);
            const messageLists = await this.rmmapi.listAllMessages(0, 0, 0,
                    RunboxWebmailAPI.LIST_ALL_MESSAGES_CHUNK_SIZE
                    , true, trashFolderName).toPromise();
            await this.rmmapi.trashMessages(messageLists.map(msg => msg.id)).toPromise();
            this.messagelistservice.refreshFolderCount();
            console.log('Deleted from', trashFolderName);
        } else {
            console.error('no trash folder found', trashFolderName);
        }
    }

    async emptySpam() {
        const spamFolderName = await this.folders.pipe(
            map(folders => folders.find(f => f.folderType === 'spam').folderName),
            take(1)
        ).toPromise();

        if (spamFolderName) {
            console.log('found spam folder with name', spamFolderName);
            const messageLists = await this.rmmapi.listAllMessages(0, 0, 0,
                    RunboxWebmailAPI.LIST_ALL_MESSAGES_CHUNK_SIZE
                    , true, spamFolderName).toPromise();
            await this.rmmapi.trashMessages(messageLists.map(msg => msg.id)).toPromise();
            this.messagelistservice.refreshFolderCount();
            console.log('Deleted from', spamFolderName);
        } else {
            console.error('no spam folder found', spamFolderName);
        }
    }
}
