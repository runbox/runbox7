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

import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { ConfirmDialog } from '../dialog/dialog.module';
import { FolderListEntry } from '../common/folderlistentry';
import { FolderMessageCountMap } from '../rmmapi/messagelist.service';
import { SimpleInputDialog, SimpleInputDialogParams } from '../dialog/simpleinput.dialog';

import { Observable } from 'rxjs';
import { first, map, filter, take } from 'rxjs/operators';
import { FlatTreeControl } from '@angular/cdk/tree';
import {ExtendedKeyboardEvent, Hotkey, HotkeysService} from 'angular2-hotkeys';

class FolderNode {
    children: FolderNode[];
    data: FolderListEntry;
}

export enum DropPosition {
    NONE,
    ABOVE,
    BELOW,
    INSIDE
}

export class CreateFolderEvent {
    parentId: number;
    name:     string;
    order:    number[];
}

export class MoveFolderEvent {
    sourceId:      number;
    destinationId: number;
    order:         number[];
}

export class RenameFolderEvent {
    id:   number;
    name: string;
}

@Component({
    moduleId: 'angular2/app/folder/',
    templateUrl: 'folderlist.component.html',
    // tslint:disable-next-line:component-selector
    selector: 'rmm-folderlist',
    styleUrls: ['folderlist.component.css']
})
export class FolderListComponent implements OnChanges {
    dropFolderId: number;
    dropPosition = DropPosition;
    dropAboveOrBelowOrInside: DropPosition = DropPosition.NONE;
    dragFolderInProgress = false;

    @Input() folders: Observable<FolderListEntry[]>;
    @Input() folderMessageCounts: Observable<FolderMessageCountMap>;
    @Input() selectedFolder: string;

    @Output() droppedToFolder = new EventEmitter<number>();
    @Output() folderSelected  = new EventEmitter<string>();

    @Output() emptyTrash       = new EventEmitter<void>();
    @Output() emptySpam        = new EventEmitter<void>();
    @Output() createFolder     = new EventEmitter<CreateFolderEvent>();
    @Output() deleteFolder     = new EventEmitter<number>();
    @Output() moveFolder       = new EventEmitter<MoveFolderEvent>();
    @Output() renameFolder     = new EventEmitter<RenameFolderEvent>();

    treeControl: FlatTreeControl<FolderListEntry>;
    treeFlattener: MatTreeFlattener<FolderNode, FolderListEntry>;
    dataSource: MatTreeFlatDataSource<FolderNode, FolderListEntry>;

    storedexpandedFolderIds: number[] = [];
    constructor(
        public dialog: MatDialog,
        private hotkeysService: HotkeysService
    ) {
        this.hotkeysService.add(
            new Hotkey(['g+i', 'g+t'],
            (event: KeyboardEvent, combo: string): ExtendedKeyboardEvent => {
                if (combo === 'g+i') {
                    this.selectFolder('Inbox');
                    combo = null;
                }
                if (combo === 'g+t') {
                    this.selectFolder('Sent');
                    combo = null;
                }
                const e: ExtendedKeyboardEvent = event;
                e.returnValue = false;
                return e;
            })
        );
        try {
            const storedExpandedFolderIds = JSON.parse(localStorage.getItem('rmm7expandedfolderids'));
            if (storedExpandedFolderIds && storedExpandedFolderIds.length > 0) {
                this.storedexpandedFolderIds = storedExpandedFolderIds;
            }
        } catch (e) {
            /* we don't care why it failed, it just means that we'll show all folders as collapsed */
        }

        this.treeControl = new FlatTreeControl<FolderListEntry>(this._getLevel, this._isExpandable);
        this.treeFlattener = new MatTreeFlattener(
            (node: FolderNode, level: number): FolderListEntry => {
                return node.data;
            },
            this._getLevel,
            this._isExpandable,
            (node: FolderNode) => node.children
        );
        this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

        this.treeControl.expansionModel.changed.subscribe(state => {
            state.added.forEach(added => {
                if (this.storedexpandedFolderIds.findIndex(fid => fid === added.folderId) === -1) {
                    this.storedexpandedFolderIds.push(added.folderId);
                }
            });
            this.storedexpandedFolderIds = this.storedexpandedFolderIds.filter(fid =>
                state.removed.findIndex(removed => removed.folderId === fid) === -1
            );
            localStorage.setItem('rmm7expandedfolderids',
                JSON.stringify(this.storedexpandedFolderIds)
            );
        });
    }

    ngOnChanges(): void {
      this.folders.subscribe(folders => {
        if (folders.length > 0) {
          this.updateFolderTree(folders);
        }
      });
    }

    private updateFolderTree(folders: FolderListEntry[]) {
        const treedata: FolderNode[] = [];

        let currentFolderLevel = 0;
        const parentStack: FolderNode[] = [];
        let previousNode: FolderNode = null;

        folders.forEach((folderCountEntry, _) => {
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

        this.dataSource.data = treedata;
    }

    private _getLevel = (node: FolderListEntry) => node.folderLevel;
    private _isExpandable = (node: FolderListEntry) => node.isExpandable ? true : false;

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

    allowDropToFolder(event: DragEvent, node: FolderListEntry): void {
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
            this.folderReorderingDrop(
                parseInt(eventText.substr('folderId:'.length), 10),
                folderId,
                this.isDropAboveOrBelowOrInside(event.offsetY)
            );
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

    selectFolder(folder: string): void {
        this.folderSelected.next(folder);
    }

    addFolder(): void {
        this.folders.pipe(
            first(),
            map(folders => folders.find(fld => fld.folderPath === this.selectedFolder))
        ).subscribe(selectedFolder => {
            const parentFolderId = selectedFolder && selectedFolder.folderType === 'user' ? selectedFolder.folderId : 0;
            const parentFolderName = this.selectedFolder;
            // const parentFolderName = this.selectedFolder.replace(/\./g, ' / ');

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
            ).subscribe(newFolderName => {
                // order needs to be: this.folders, with newFolder inserted
                // after its parent .. put a "-1" there
                this.folders.pipe(take(1)).subscribe((folders) => {
                    const order = folders.map(folder => folder.folderId);
                    const parentInd = order.findIndex((ind) => parentFolderId);
                    order.splice(parentInd > -1 ? parentInd : 0, 0, -1);
                    this.createFolder.emit({
                        parentId: parentFolderId,
                        name:     newFolderName,
                        order:    order,
                    });
                });
            });
        });
    }

    addSubFolderDialog(folder: FolderListEntry): void {
        const dialogRef = this.dialog.open(SimpleInputDialog, {
            data:
                new SimpleInputDialogParams('Add new folder',
                    `Create new folder under ${folder.folderName}`,
                    'New folder name',
                    (value: string) => value && value.trim().length > 0
                )
        }
        );
        dialogRef.afterClosed().pipe(
            filter(res => res && res.length > 0),
        ).subscribe(newFolderName => {
            this.folders.pipe(take(1)).subscribe((folders) => {
                const order = folders.map(f => f.folderId);
                const parentInd = order.findIndex((ind) => folder.folderId);
                order.splice(parentInd > -1 ? parentInd : 0, 0, -1);
                this.createFolder.emit({
                    parentId: folder.folderId,
                    name:     newFolderName,
                    order:    order,
                });
            });
        });
    }

    renameFolderDialog(folder: FolderListEntry): void {
        const dialogRef = this.dialog.open(SimpleInputDialog, {
            data: new SimpleInputDialogParams('Rename folder',
                `Rename folder ${folder.folderName}`,
                'New folder name',
                (value: string) => value && value.trim().length > 0
            )
        });
        dialogRef.afterClosed().pipe(
            filter(res => res && res.length > 0),
        ).subscribe(
            newFolderName => this.renameFolder.emit({
                id:   folder.folderId,
                name: newFolderName,
            })
        );
    }

    deleteFolderDialog(folder: FolderListEntry): void {
        const confirmDialog = this.dialog.open(ConfirmDialog);
        confirmDialog.componentInstance.title = `Delete folder ${folder.folderName}?`;
        confirmDialog.componentInstance.question =
        `Are you sure that you want to delete the folder named ${folder.folderName}?`;
        confirmDialog.componentInstance.noOptionTitle = 'cancel';
        confirmDialog.componentInstance.yesOptionTitle = 'ok';
        confirmDialog.afterClosed().pipe(
            filter(res => res === true),
        ).subscribe(
            () => this.deleteFolder.emit(folder.folderId)
        );
    }

    async folderReorderingDrop(sourceFolderId: number, destinationFolderId: number, aboveOrBelowOrInside: number) {
        if (sourceFolderId === destinationFolderId) {
            // can't move a folder above, below or inside itself
            return;
        }

        const folders = await this.folders.pipe(take(1)).toPromise();
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
            const pathArr = folderPath.split('.');
            return pathArr.slice(0, pathArr.length - 1).join('.');
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
                `${destinationParent}${destinationParent.length > 0 ? '.' : ''}` +
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

        // Adjust the priorities, client-side
        // Eventually the backend will do it by itself, and we'll se the results on the next reload.
        // We'd rather see an instant change in the UI though -- so let's calculate temporary priorities
        // so that everythings looks alright.
        let priority = 1;
        for (const f of folders) {
            f.priority = priority++;
        }

        // console.log('after rearrange', folders.map(f => `${f.folderId} ${f.folderPath} ${f.priority}`));

        this.updateFolderTree(folders);

        const newParentFolderId = destinationParent ? folders.find(fld => fld.folderPath === destinationParent).folderId : 0;
        this.moveFolder.emit({
            sourceId:      sourceFolderId,
            destinationId: newParentFolderId,
            order:         folders.map(folder => folder.folderId),
        });
    }
}
